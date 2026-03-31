package com.mv_services.backend.controller;

import com.mv_services.backend.dto.AuthResponse;
import com.mv_services.backend.dto.AuthMeResponse;
import com.mv_services.backend.dto.LoginRequest;
import com.mv_services.backend.dto.RegisterRequest;
import com.mv_services.backend.dto.RegisterShipperRequest;
import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.UsuarioRepository;
import com.mv_services.backend.service.AuthService;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/register-shipper")
    public ResponseEntity<AuthResponse> registerShipper(@RequestBody RegisterShipperRequest request) {
        return ResponseEntity.ok(authService.registerShipper(request));
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticate(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
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

        return ResponseEntity.ok(AuthMeResponse.builder()
                .username(u.getUsername())
                .email(u.getEmail())
                .rol(rol)
                .permisos(permisos)
                .shipperId(shipperId)
                .shipperNombre(shipperNombre)
                .build());
    }
}
