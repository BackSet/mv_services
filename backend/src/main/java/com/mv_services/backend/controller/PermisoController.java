package com.mv_services.backend.controller;

import com.mv_services.backend.model.Permiso;
import com.mv_services.backend.repository.PermisoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/permisos")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
public class PermisoController {

    private final PermisoRepository permisoRepository;

    public PermisoController(PermisoRepository permisoRepository) {
        this.permisoRepository = permisoRepository;
    }

    @GetMapping
    public List<Permiso> getAllPermisos() {
        return permisoRepository.findAll();
    }

    @PostMapping
    public Permiso createPermiso(@RequestBody Permiso permiso) {
        return permisoRepository.save(permiso);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Permiso> getPermisoById(@PathVariable Long id) {
        return permisoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Permiso> updatePermiso(@PathVariable Long id, @RequestBody Permiso permisoDetails) {
        return permisoRepository.findById(id)
                .map(permiso -> {
                    permiso.setNombre(permisoDetails.getNombre());
                    permiso.setDescripcion(permisoDetails.getDescripcion());
                    return ResponseEntity.ok(permisoRepository.save(permiso));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePermiso(@PathVariable Long id) {
        if (permisoRepository.existsById(id)) {
            permisoRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
