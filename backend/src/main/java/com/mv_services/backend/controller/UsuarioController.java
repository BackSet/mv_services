package com.mv_services.backend.controller;

import com.mv_services.backend.dto.UsuarioRequest;
import com.mv_services.backend.model.Rol;
import com.mv_services.backend.model.Shipper;
import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.RolRepository;
import com.mv_services.backend.repository.ShipperRepository;
import com.mv_services.backend.repository.UsuarioRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final ShipperRepository shipperRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            ShipperRepository shipperRepository,
            PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.shipperRepository = shipperRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<Usuario> getAllUsuarios() {
        return usuarioRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Usuario> createUsuario(@Valid @RequestBody UsuarioRequest body) {
        String password = body.getPassword();
        if (password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña es obligatoria.");
        }

        validateUniqueness(body.getUsername(), body.getEmail(), null);

        Usuario usuario = new Usuario();
        usuario.setUsername(body.getUsername().trim());
        usuario.setEmail(body.getEmail().trim());
        usuario.setPassword(passwordEncoder.encode(password));
        usuario.setRol(resolveRol(body.getRol()));
        usuario.setShipper(resolveShipper(body.getShipper()));
        usuario.setActivo(body.isActivo());

        Usuario saved = usuarioRepository.save(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Usuario> getUsuarioById(@PathVariable Long id) {
        return usuarioRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Usuario> updateUsuario(
            @PathVariable Long id,
            @Valid @RequestBody UsuarioRequest body) {
        return usuarioRepository.findById(id)
                .map(usuario -> {
                    validateUniqueness(body.getUsername(), body.getEmail(), id);

                    usuario.setUsername(body.getUsername().trim());
                    usuario.setEmail(body.getEmail().trim());
                    usuario.setRol(resolveRol(body.getRol()));
                    usuario.setShipper(resolveShipper(body.getShipper()));
                    usuario.setActivo(body.isActivo());

                    String newPassword = body.getPassword();
                    if (newPassword != null && !newPassword.isBlank()) {
                        usuario.setPassword(passwordEncoder.encode(newPassword));
                    }

                    return ResponseEntity.ok(usuarioRepository.save(usuario));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-shipper/{shipperId}")
    public ResponseEntity<Usuario> getByShipperId(@PathVariable Long shipperId) {
        return usuarioRepository.findByShipperId(shipperId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUsuario(@PathVariable Long id) {
        if (usuarioRepository.existsById(id)) {
            usuarioRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private Rol resolveRol(UsuarioRequest.RolRef ref) {
        if (ref == null || ref.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rol es obligatorio.");
        }
        return rolRepository.findById(ref.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Rol no encontrado: " + ref.getId()));
    }

    private Shipper resolveShipper(UsuarioRequest.ShipperRef ref) {
        if (ref == null || ref.getId() == null) {
            return null;
        }
        return shipperRepository.findById(ref.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Shipper no encontrado: " + ref.getId()));
    }

    private void validateUniqueness(String username, String email, Long excludeId) {
        usuarioRepository.findByUsername(username.trim()).ifPresent(existing -> {
            if (excludeId == null || !existing.getId().equals(excludeId)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "El nombre de usuario ya está en uso.");
            }
        });
        usuarioRepository.findByEmail(email.trim()).ifPresent(existing -> {
            if (excludeId == null || !existing.getId().equals(excludeId)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "El correo ya está en uso.");
            }
        });
    }

}
