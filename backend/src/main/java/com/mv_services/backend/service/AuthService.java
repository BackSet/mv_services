package com.mv_services.backend.service;

import com.mv_services.backend.dto.AuthResponse;
import com.mv_services.backend.dto.LoginRequest;
import com.mv_services.backend.dto.RegisterRequest;
import com.mv_services.backend.dto.RegisterShipperRequest;
import com.mv_services.backend.dto.RegisterShipperResponse;
import com.mv_services.backend.model.EstadoSolicitudShipper;
import com.mv_services.backend.model.Rol;
import com.mv_services.backend.model.ShipperSolicitud;
import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.RolRepository;
import com.mv_services.backend.repository.ShipperSolicitudRepository;
import com.mv_services.backend.repository.UsuarioRepository;
import com.mv_services.backend.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final ShipperSolicitudRepository solicitudRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;

    /**
     * Crea una solicitud de registro de shipper en estado PENDIENTE.
     * No crea Usuario ni Shipper hasta que un operario apruebe.
     */
    public RegisterShipperResponse registerShipper(RegisterShipperRequest request) {
        String username = request.getUsername() == null ? "" : request.getUsername().trim();
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();

        if (username.isBlank() || email.isBlank() || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("username, email y password son obligatorios.");
        }

        if (usuarioRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("El username ya está en uso.");
        }
        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("El email ya está en uso.");
        }
        if (solicitudRepository.existsByUsernameIgnoreCaseAndEstado(username, EstadoSolicitudShipper.PENDIENTE)) {
            throw new IllegalArgumentException("Ya existe una solicitud pendiente con este username.");
        }
        if (solicitudRepository.existsByEmailIgnoreCaseAndEstado(email, EstadoSolicitudShipper.PENDIENTE)) {
            throw new IllegalArgumentException("Ya existe una solicitud pendiente con este email.");
        }

        ShipperSolicitud solicitud = ShipperSolicitud.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .shipperNombre(safeTrim(request.getShipperNombre()))
                .codigoInterno(safeTrim(request.getCodigoInterno()))
                .nombreEncargado(safeTrim(request.getNombreEncargado()))
                .estado(EstadoSolicitudShipper.PENDIENTE)
                .build();
        solicitud = solicitudRepository.save(solicitud);

        return RegisterShipperResponse.builder()
                .requestId(solicitud.getId())
                .estado(solicitud.getEstado().name())
                .message("Solicitud recibida. Un operario revisará tu registro y serás notificado cuando puedas iniciar sesión.")
                .build();
    }

    public AuthResponse register(RegisterRequest request) {
        // Rol por defecto al registrarse un cliente: SHIPPER (solo gestiona sus paquetes).
        Rol rol = rolRepository.findByNombre("SHIPPER")
                .orElseGet(() -> rolRepository.save(Rol.builder().nombre("SHIPPER").build()));

        Usuario usuario = Usuario.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(rol)
                .activo(true)
                .build();

        usuarioRepository.save(usuario);

        var jwtToken = jwtUtils
                .generateToken(new User(usuario.getUsername(), usuario.getPassword(), new ArrayList<>()));
        return AuthResponse.builder().token(jwtToken).build();
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        } catch (UsernameNotFoundException ex) {
            // Si no hay usuario, revisar si existe una solicitud para devolver mensaje específico.
            checkSolicitudAndThrow(request.getUsername());
            throw ex;
        } catch (AuthenticationException ex) {
            // Spring Security devuelve BadCredentialsException incluso para usuarios inexistentes.
            // Si NO existe el usuario, miramos solicitudes para devolver un mensaje útil.
            if (usuarioRepository.findByUsername(request.getUsername()).isEmpty()
                    && usuarioRepository.findByEmail(request.getUsername()).isEmpty()) {
                checkSolicitudAndThrow(request.getUsername());
            }
            throw ex;
        }

        Usuario usuario = usuarioRepository.findByUsername(request.getUsername()).orElseThrow();
        var jwtToken = jwtUtils
                .generateToken(new User(usuario.getUsername(), usuario.getPassword(), new ArrayList<>()));
        return AuthResponse.builder().token(jwtToken).build();
    }

    private void checkSolicitudAndThrow(String identifier) {
        if (identifier == null || identifier.isBlank()) return;
        Optional<ShipperSolicitud> opt = solicitudRepository
                .findFirstByUsernameIgnoreCaseOrderByFechaSolicitudDesc(identifier.trim());
        if (opt.isEmpty()) {
            opt = solicitudRepository
                    .findFirstByEmailIgnoreCaseOrderByFechaSolicitudDesc(identifier.trim());
        }
        if (opt.isEmpty()) return;
        ShipperSolicitud s = opt.get();
        if (s.getEstado() == EstadoSolicitudShipper.PENDIENTE) {
            throw new ShipperSolicitudPendienteException(
                    "Tu registro aún está pendiente de aprobación por un operario.");
        }
        if (s.getEstado() == EstadoSolicitudShipper.RECHAZADA) {
            throw new ShipperSolicitudRechazadaException(
                    "Tu solicitud de registro fue rechazada.",
                    s.getMotivoRechazo());
        }
        // APROBADA pero sin usuario → caso muy raro, dejar que siga el flujo normal.
    }

    private String safeTrim(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    /** Excepción específica: solicitud aún pendiente de aprobación. */
    public static class ShipperSolicitudPendienteException extends RuntimeException {
        public ShipperSolicitudPendienteException(String message) {
            super(message);
        }
    }

    /** Excepción específica: solicitud rechazada. */
    public static class ShipperSolicitudRechazadaException extends RuntimeException {
        private final String motivo;

        public ShipperSolicitudRechazadaException(String message, String motivo) {
            super(message);
            this.motivo = motivo;
        }

        public String getMotivo() {
            return motivo;
        }
    }
}
