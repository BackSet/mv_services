package com.mv_services.backend.controller;

import com.mv_services.backend.dto.AuthResponse;
import com.mv_services.backend.dto.AuthMeResponse;
import com.mv_services.backend.dto.ChangePasswordRequest;
import com.mv_services.backend.dto.LoginRequest;
import com.mv_services.backend.dto.RegisterRequest;
import com.mv_services.backend.dto.RegisterShipperRequest;
import com.mv_services.backend.dto.RegisterShipperResponse;
import com.mv_services.backend.dto.UpdateMeRequest;
import com.mv_services.backend.dto.UpdateMyShipperRequest;
import com.mv_services.backend.model.Shipper;
import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.ShipperRepository;
import com.mv_services.backend.repository.UsuarioRepository;
import com.mv_services.backend.security.JwtUtils;
import com.mv_services.backend.service.AuthService;
import com.mv_services.backend.service.AuthService.ShipperSolicitudPendienteException;
import com.mv_services.backend.service.AuthService.ShipperSolicitudRechazadaException;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final UsuarioRepository usuarioRepository;
    private final ShipperRepository shipperRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/register-shipper")
    public ResponseEntity<?> registerShipper(@RequestBody RegisterShipperRequest request) {
        try {
            RegisterShipperResponse resp = authService.registerShipper(request);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticate(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (ShipperSolicitudPendienteException ex) {
            Map<String, Object> body = new HashMap<>();
            body.put("code", "SHIPPER_SOLICITUD_PENDIENTE");
            body.put("message", ex.getMessage());
            return ResponseEntity.status(403).body(body);
        } catch (ShipperSolicitudRechazadaException ex) {
            Map<String, Object> body = new HashMap<>();
            body.put("code", "SHIPPER_SOLICITUD_RECHAZADA");
            body.put("message", ex.getMessage());
            if (ex.getMotivo() != null) body.put("motivo", ex.getMotivo());
            return ResponseEntity.status(403).body(body);
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(401).body(Map.of("message", "Usuario o contraseña inválidos."));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<AuthMeResponse> me(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return ResponseEntity.status(401).build();
        }
        Usuario u = usuarioRepository.findByUsername(authentication.getName()).orElse(null);
        if (u == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(toAuthMeResponse(u));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(
            @Valid @RequestBody UpdateMeRequest body,
            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        Usuario u = usuarioRepository.findByUsername(authentication.getName()).orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        String newUsername = body.getUsername().trim();
        String newEmail = body.getEmail().trim().toLowerCase();

        // Unicidad si cambia
        if (!newUsername.equalsIgnoreCase(u.getUsername())
                && usuarioRepository.findByUsername(newUsername).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("message", "El username ya está en uso."));
        }
        if (!newEmail.equalsIgnoreCase(u.getEmail())
                && usuarioRepository.findByEmail(newEmail).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("message", "El email ya está en uso."));
        }

        boolean usernameChanged = !newUsername.equals(u.getUsername());
        u.setUsername(newUsername);
        u.setEmail(newEmail);
        usuarioRepository.save(u);

        Map<String, Object> resp = new HashMap<>();
        resp.put("me", toAuthMeResponse(u));
        if (usernameChanged) {
            String newToken = jwtUtils.generateToken(
                    new User(u.getUsername(), u.getPassword(), new ArrayList<>()));
            resp.put("token", newToken);
        }
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordRequest body,
            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        Usuario u = usuarioRepository.findByUsername(authentication.getName()).orElse(null);
        if (u == null) return ResponseEntity.status(401).build();

        if (!passwordEncoder.matches(body.getCurrentPassword(), u.getPassword())) {
            return ResponseEntity.status(400)
                    .body(Map.of("message", "La contraseña actual no es correcta."));
        }
        if (body.getNewPassword().equals(body.getCurrentPassword())) {
            return ResponseEntity.status(400)
                    .body(Map.of("message", "La nueva contraseña debe ser distinta a la actual."));
        }
        u.setPassword(passwordEncoder.encode(body.getNewPassword()));
        usuarioRepository.save(u);
        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada."));
    }

    @PutMapping("/me/shipper")
    public ResponseEntity<?> updateMyShipper(
            @Valid @RequestBody UpdateMyShipperRequest body,
            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        Usuario u = usuarioRepository.findByUsername(authentication.getName()).orElse(null);
        if (u == null) return ResponseEntity.status(401).build();
        Shipper sh = u.getShipper();
        if (sh == null) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "El usuario no tiene un shipper asociado."));
        }
        sh.setNombre(body.getNombre().trim());
        sh.setCodigoInterno(emptyToNull(body.getCodigoInterno()));
        sh.setNombreEncargado(emptyToNull(body.getNombreEncargado()));
        shipperRepository.save(sh);
        return ResponseEntity.ok(toAuthMeResponse(u));
    }

    private AuthMeResponse toAuthMeResponse(Usuario u) {
        String rol = u.getRol() != null ? u.getRol().getNombre() : null;
        Long shipperId = u.getShipper() != null ? u.getShipper().getId() : null;
        String shipperNombre = u.getShipper() != null ? u.getShipper().getNombre() : null;
        List<String> permisos = (u.getRol() != null && u.getRol().getPermisos() != null)
                ? u.getRol().getPermisos().stream()
                .map(p -> p.getNombre())
                .filter(n -> n != null && !n.isBlank())
                .sorted(Comparator.naturalOrder())
                .toList()
                : List.of();

        return AuthMeResponse.builder()
                .username(u.getUsername())
                .email(u.getEmail())
                .rol(rol)
                .permisos(permisos)
                .shipperId(shipperId)
                .shipperNombre(shipperNombre)
                .build();
    }

    private String emptyToNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}
