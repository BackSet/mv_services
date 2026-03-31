package com.mv_services.backend.controller;

import com.mv_services.backend.dto.PaqueteRegistroMinimoRequest;
import com.mv_services.backend.model.Paquete;
import com.mv_services.backend.repository.PaqueteRepository;
import com.mv_services.backend.repository.ShipperRepository;
import com.mv_services.backend.security.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/paquetes")
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN','SHIPPER') or hasAuthority('paquetes.read') or hasAuthority('paquetes.update') or hasAuthority('paquetes.delete')")
public class PaqueteController {

    private final PaqueteRepository paqueteRepository;
    private final CurrentUserService currentUserService;
    private final ShipperRepository shipperRepository;

    public PaqueteController(
            PaqueteRepository paqueteRepository,
            CurrentUserService currentUserService,
            ShipperRepository shipperRepository
    ) {
        this.paqueteRepository = paqueteRepository;
        this.currentUserService = currentUserService;
        this.shipperRepository = shipperRepository;
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
        Double kgs = req.getPesoKgs();

        // Completar peso faltante si es posible
        if (lbs == null && kgs != null) {
            lbs = kgs * 2.2046226218d;
        } else if (kgs == null && lbs != null) {
            kgs = lbs * 0.45359237d;
        }

        Paquete paquete = Paquete.builder()
                .numeroGuia(req.getNumeroGuia())
                .pesoLbs(lbs)
                .pesoKgs(kgs)
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
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN','SHIPPER') or hasAuthority('paquetes.update')")
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
                    if (paqueteDetails.getPesoLbs() != null && paqueteDetails.getPesoKgs() != null) {
                        paquete.setPesoLbs(paqueteDetails.getPesoLbs());
                        paquete.setPesoKgs(paqueteDetails.getPesoKgs());
                    } else if (paqueteDetails.getPesoLbs() != null) {
                        paquete.setPesoLbs(paqueteDetails.getPesoLbs());
                        paquete.setPesoKgs(paqueteDetails.getPesoLbs() * 0.45359237d);
                    } else if (paqueteDetails.getPesoKgs() != null) {
                        paquete.setPesoKgs(paqueteDetails.getPesoKgs());
                        paquete.setPesoLbs(paqueteDetails.getPesoKgs() * 2.2046226218d);
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
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN','SHIPPER') or hasAuthority('paquetes.delete')")
    public ResponseEntity<Void> deletePaquete(@PathVariable Long id) {
        if (currentUserService.isRole("SHIPPER")) {
            var u = currentUserService.getCurrentUser();
            if (u == null || u.getShipper() == null) return ResponseEntity.notFound().build();
            var opt = paqueteRepository.findByIdAndShipperId(id, u.getShipper().getId());
            if (opt.isEmpty()) return ResponseEntity.notFound().build();
            paqueteRepository.deleteById(opt.get().getId());
            return ResponseEntity.ok().build();
        }
        if (!paqueteRepository.existsById(id)) return ResponseEntity.notFound().build();
        paqueteRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
