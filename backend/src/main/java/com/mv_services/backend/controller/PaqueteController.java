package com.mv_services.backend.controller;

import com.mv_services.backend.dto.PaqueteRegistroMinimoRequest;
import com.mv_services.backend.model.Paquete;
import com.mv_services.backend.repository.PaqueteRepository;
import com.mv_services.backend.repository.ShipperRepository;
import com.mv_services.backend.security.CurrentUserService;
import com.mv_services.backend.service.ConsolidadoOpsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/paquetes")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasRole('SHIPPER') or hasAuthority('paquetes.read') or hasAuthority('paquetes.create_minimo') or hasAuthority('paquetes.update') or hasAuthority('paquetes.delete')")
public class PaqueteController {

    private final PaqueteRepository paqueteRepository;
    private final CurrentUserService currentUserService;
    private final ShipperRepository shipperRepository;
    private final ConsolidadoOpsService consolidadoOpsService;

    public PaqueteController(
            PaqueteRepository paqueteRepository,
            CurrentUserService currentUserService,
            ShipperRepository shipperRepository,
            ConsolidadoOpsService consolidadoOpsService
    ) {
        this.paqueteRepository = paqueteRepository;
        this.currentUserService = currentUserService;
        this.shipperRepository = shipperRepository;
        this.consolidadoOpsService = consolidadoOpsService;
    }

    @GetMapping
    public List<Paquete> getAllPaquetes() {
        if (currentUserService.isRole("SHIPPER")) {
            var u = currentUserService.getCurrentUser();
            if (u == null || u.getShipper() == null) return List.of();
            return paqueteRepository.findByShipperId(u.getShipper().getId());
        }
        return paqueteRepository.findAll();
    }

    @PostMapping
    public Paquete createPaquete(@RequestBody Paquete paquete) {
        if (currentUserService.isRole("SHIPPER")) {
            var u = currentUserService.getCurrentUser();
            if (u == null || u.getShipper() == null) {
                throw new IllegalStateException("Usuario SHIPPER sin shipper asociado.");
            }
            // Forzar shipper del usuario autenticado
            paquete.setShipper(u.getShipper());
        }
        // La posición sólo la asigna el ConsolidadoController al agregar paquete.
        paquete.setPosicionEnConsolidado(null);
        paquete.setFechaRegistro(LocalDateTime.now());
        return paqueteRepository.save(paquete);
    }

    /**
     * Registro mínimo: permite crear el paquete solo con número de guía, peso y contenido.
     * No requiere shipper, dirección, teléfono ni consolidado.
     */
    @PostMapping("/registro-minimo")
    public ResponseEntity<?> registroMinimo(@Valid @RequestBody PaqueteRegistroMinimoRequest req) {
        // Validación de peso
        if (req.getPesoLbs() == null && req.getPesoKgs() == null) {
            return ResponseEntity.badRequest().body("Debe enviar peso (peso/pesoLbs o pesoKgs).");
        }

        if (paqueteRepository.findByNumeroGuia(req.getNumeroGuia()).isPresent()) {
            return ResponseEntity.badRequest().body("Ya existe un paquete con ese número de guía.");
        }

        Double lbs = req.getPesoLbs();
        // Si sólo llega kgs, convertir a libras (única unidad persistida).
        if (lbs == null && req.getPesoKgs() != null) {
            lbs = req.getPesoKgs() * 2.2046226218d;
        }

        Paquete paquete = Paquete.builder()
                .numeroGuia(req.getNumeroGuia())
                .pesoLbs(lbs)
                .contenido(req.getContenido())
                .destinatario(req.getDestinatario())
                .ref(req.getRef())
                .fechaRegistro(LocalDateTime.now())
                .build();

        if (currentUserService.isRole("SHIPPER")) {
            var u = currentUserService.getCurrentUser();
            if (u != null && u.getShipper() != null) {
                paquete.setShipper(u.getShipper());
            }
        } else if (req.getShipperId() != null) {
            var optShipper = shipperRepository.findById(req.getShipperId());
            if (optShipper.isEmpty()) {
                return ResponseEntity.badRequest().body("Shipper no existe.");
            }
            paquete.setShipper(optShipper.get());
        }

        Paquete saved = paqueteRepository.save(paquete);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Paquete> getPaqueteById(@PathVariable Long id) {
        if (currentUserService.isRole("SHIPPER")) {
            var u = currentUserService.getCurrentUser();
            if (u == null || u.getShipper() == null) return ResponseEntity.notFound().build();
            return paqueteRepository.findByIdAndShipperId(id, u.getShipper().getId())
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }
        return paqueteRepository.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Busca un paquete por número de guía (para operario: escanear/teclear código e imprimir etiqueta).
     * SHIPPER solo puede ver paquetes de su shipper.
     */
    @GetMapping("/by-guia")
    public ResponseEntity<Paquete> getPaqueteByNumeroGuia(@RequestParam String numeroGuia) {
        if (numeroGuia == null || numeroGuia.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        var trimmed = numeroGuia.trim();
        if (currentUserService.isRole("SHIPPER")) {
            var u = currentUserService.getCurrentUser();
            if (u == null || u.getShipper() == null) return ResponseEntity.notFound().build();
            return paqueteRepository.findByNumeroGuia(trimmed)
                    .filter(p -> p.getShipper() != null && p.getShipper().getId().equals(u.getShipper().getId()))
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }
        return paqueteRepository.findByNumeroGuia(trimmed)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SHIPPER') or hasAuthority('paquetes.update')")
    public ResponseEntity<Paquete> updatePaquete(@PathVariable Long id, @RequestBody Paquete paqueteDetails) {
        var u = currentUserService.getCurrentUser();
        boolean isShipper = currentUserService.isRole("SHIPPER");

        var opt = isShipper && u != null && u.getShipper() != null
                ? paqueteRepository.findByIdAndShipperId(id, u.getShipper().getId())
                : paqueteRepository.findById(id);

        return opt.map(paquete -> {
                    if (paqueteDetails.getNumeroGuia() != null) {
                        paquete.setNumeroGuia(paqueteDetails.getNumeroGuia());
                    }
                    if (!isShipper && paqueteDetails.getShipper() != null) {
                        paquete.setShipper(paqueteDetails.getShipper());
                    }
                    // Sólo se persiste el peso en libras; se ignora cualquier pesoKgs entrante.
                    if (paqueteDetails.getPesoLbs() != null) {
                        paquete.setPesoLbs(paqueteDetails.getPesoLbs());
                    }
                    if (paqueteDetails.getContenido() != null) {
                        paquete.setContenido(paqueteDetails.getContenido());
                    }
                    if (paqueteDetails.getDestinatario() != null) {
                        paquete.setDestinatario(paqueteDetails.getDestinatario());
                    }
                    if (paqueteDetails.getRef() != null) {
                        paquete.setRef(paqueteDetails.getRef());
                    }
                    if (paqueteDetails.getConsolidado() != null) {
                        paquete.setConsolidado(paqueteDetails.getConsolidado());
                    }
                    return ResponseEntity.ok(paqueteRepository.save(paquete));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SHIPPER') or hasAuthority('paquetes.delete')")
    public ResponseEntity<Void> deletePaquete(@PathVariable Long id) {
        if (currentUserService.isRole("SHIPPER")) {
            var u = currentUserService.getCurrentUser();
            if (u == null || u.getShipper() == null) return ResponseEntity.notFound().build();
            var opt = paqueteRepository.findByIdAndShipperId(id, u.getShipper().getId());
            if (opt.isEmpty()) return ResponseEntity.notFound().build();
            Long consolidadoId = opt.get().getConsolidado() != null ? opt.get().getConsolidado().getId() : null;
            paqueteRepository.deleteById(opt.get().getId());
            if (consolidadoId != null) consolidadoOpsService.reordenarPosiciones(consolidadoId);
            return ResponseEntity.noContent().build();
        }
        var existing = paqueteRepository.findById(id);
        if (existing.isEmpty()) return ResponseEntity.notFound().build();
        Long consolidadoId = existing.get().getConsolidado() != null ? existing.get().getConsolidado().getId() : null;
        paqueteRepository.deleteById(id);
        if (consolidadoId != null) consolidadoOpsService.reordenarPosiciones(consolidadoId);
        return ResponseEntity.noContent().build();
    }
}
