package com.mv_services.backend.controller;

import com.mv_services.backend.model.Rol;
import com.mv_services.backend.model.Permiso;
import com.mv_services.backend.repository.PermisoRepository;
import com.mv_services.backend.repository.RolRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.HashSet;
import java.util.Set;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
public class RolController {

    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;

    public RolController(RolRepository rolRepository, PermisoRepository permisoRepository) {
        this.rolRepository = rolRepository;
        this.permisoRepository = permisoRepository;
    }

    @GetMapping
    public List<Rol> getAllRoles() {
        return rolRepository.findAll();
    }

    @PostMapping
    public Rol createRol(@RequestBody Rol rol) {
        // Resolver permisos por ID para evitar "detached entity passed to persist"
        if (rol != null && rol.getPermisos() != null && !rol.getPermisos().isEmpty()) {
            Set<Permiso> managedPermisos = new HashSet<>();
            for (Permiso p : rol.getPermisos()) {
                if (p != null && p.getId() != null) {
                    permisoRepository.findById(p.getId()).ifPresent(managedPermisos::add);
                }
            }
            rol.setPermisos(managedPermisos);
        }

        return rolRepository.save(rol);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Rol> getRolById(@PathVariable Long id) {
        return rolRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Rol> updateRol(@PathVariable Long id, @RequestBody Rol rolDetails) {
        return rolRepository.findById(id)
                .map(rol -> {
                    rol.setNombre(rolDetails.getNombre());

                    // Resolver permisos por ID para evitar "detached entity passed to persist"
                    Set<Permiso> managedPermisos = new HashSet<>();
                    if (rolDetails != null && rolDetails.getPermisos() != null) {
                        for (Permiso p : rolDetails.getPermisos()) {
                            if (p != null && p.getId() != null) {
                                permisoRepository.findById(p.getId()).ifPresent(managedPermisos::add);
                            }
                        }
                    }
                    rol.setPermisos(managedPermisos);

                    return ResponseEntity.ok(rolRepository.save(rol));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRol(@PathVariable Long id) {
        if (rolRepository.existsById(id)) {
            rolRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
