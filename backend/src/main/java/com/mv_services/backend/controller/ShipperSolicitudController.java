package com.mv_services.backend.controller;

import com.mv_services.backend.dto.RechazarSolicitudRequest;
import com.mv_services.backend.model.EstadoSolicitudShipper;
import com.mv_services.backend.model.ShipperSolicitud;
import com.mv_services.backend.repository.ShipperSolicitudRepository;
import com.mv_services.backend.service.ShipperSolicitudService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shipper-solicitudes")
@RequiredArgsConstructor
public class ShipperSolicitudController {

    private final ShipperSolicitudRepository solicitudRepository;
    private final ShipperSolicitudService solicitudService;

    @GetMapping
    @PreAuthorize("hasAuthority('shippers.aprobar')")
    public ResponseEntity<List<ShipperSolicitud>> list(
            @RequestParam(name = "estado", required = false, defaultValue = "PENDIENTE") String estado) {
        List<ShipperSolicitud> data;
        if ("ALL".equalsIgnoreCase(estado) || "TODOS".equalsIgnoreCase(estado) || "TODAS".equalsIgnoreCase(estado)) {
            data = solicitudRepository.findAllByOrderByFechaSolicitudDesc();
        } else {
            EstadoSolicitudShipper st = parseEstado(estado);
            data = solicitudRepository.findByEstadoOrderByFechaSolicitudDesc(st);
        }
        return ResponseEntity.ok(data);
    }

    @GetMapping("/count")
    @PreAuthorize("hasAuthority('shippers.aprobar')")
    public ResponseEntity<Map<String, Object>> count(
            @RequestParam(name = "estado", required = false, defaultValue = "PENDIENTE") String estado) {
        EstadoSolicitudShipper st = parseEstado(estado);
        long count = solicitudRepository.countByEstado(st);
        return ResponseEntity.ok(Map.of("estado", st.name(), "count", count));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('shippers.aprobar')")
    public ResponseEntity<ShipperSolicitud> get(@PathVariable Long id) {
        return solicitudRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/aprobar")
    @PreAuthorize("hasAuthority('shippers.aprobar')")
    public ResponseEntity<?> aprobar(@PathVariable Long id, Authentication authentication) {
        String currentUsername = authentication != null ? authentication.getName() : null;
        try {
            ShipperSolicitud s = solicitudService.aprobar(id, currentUsername);
            return ResponseEntity.ok(s);
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(404).body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(409).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/{id}/rechazar")
    @PreAuthorize("hasAuthority('shippers.aprobar')")
    public ResponseEntity<?> rechazar(
            @PathVariable Long id,
            @Valid @RequestBody RechazarSolicitudRequest body,
            Authentication authentication) {
        String currentUsername = authentication != null ? authentication.getName() : null;
        try {
            ShipperSolicitud s = solicitudService.rechazar(id, body.getMotivo(), currentUsername);
            return ResponseEntity.ok(s);
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(404).body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(409).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    private EstadoSolicitudShipper parseEstado(String value) {
        try {
            return EstadoSolicitudShipper.valueOf(value.trim().toUpperCase());
        } catch (Exception ex) {
            return EstadoSolicitudShipper.PENDIENTE;
        }
    }
}
