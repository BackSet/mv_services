package com.mv_services.backend.service;

import com.mv_services.backend.dto.AuthResponse;
import com.mv_services.backend.dto.LoginRequest;
import com.mv_services.backend.dto.RegisterRequest;
import com.mv_services.backend.dto.RegisterShipperRequest;
import com.mv_services.backend.model.Rol;
import com.mv_services.backend.model.Shipper;
import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.RolRepository;
import com.mv_services.backend.repository.ShipperRepository;
import com.mv_services.backend.repository.UsuarioRepository;
import com.mv_services.backend.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final ShipperRepository shipperRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;

    public AuthResponse registerShipper(RegisterShipperRequest request) {
        if (usuarioRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("El username ya está en uso.");
        }
        if (usuarioRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("El email ya está en uso.");
        }

        Rol rol = rolRepository.findByNombre("SHIPPER")
                .orElseGet(() -> rolRepository.save(Rol.builder().nombre("SHIPPER").build()));

        Shipper shipper = Shipper.builder()
                .nombre(request.getShipperNombre())
                .codigoInterno(request.getCodigoInterno())
                .nombreEncargado(request.getNombreEncargado())
                .build();
        shipper = shipperRepository.save(shipper);

        Usuario usuario = Usuario.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(rol)
                .shipper(shipper)
                .activo(true)
                .build();

        usuarioRepository.save(usuario);

        var jwtToken = jwtUtils
                .generateToken(new User(usuario.getUsername(), usuario.getPassword(), new ArrayList<>()));
        return AuthResponse.builder().token(jwtToken).build();
    }

    public AuthResponse register(RegisterRequest request) {
        Rol rol = rolRepository.findByNombre("DESTINATARIO_FINAL")
                .orElseGet(() -> rolRepository.save(Rol.builder().nombre("DESTINATARIO_FINAL").build()));

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
        } catch (AuthenticationException ex) {
            throw ex;
        }

        Usuario usuario = usuarioRepository.findByUsername(request.getUsername()).orElseThrow();
        var jwtToken = jwtUtils
                .generateToken(new User(usuario.getUsername(), usuario.getPassword(), new ArrayList<>()));
        return AuthResponse.builder().token(jwtToken).build();
    }
}
