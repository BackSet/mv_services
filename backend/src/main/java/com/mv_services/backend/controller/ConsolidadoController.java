package com.mv_services.backend.controller;

import com.mv_services.backend.model.Consolidado;
import com.mv_services.backend.model.ConsolidadoEstado;
import com.mv_services.backend.model.Paquete;
import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.ConsolidadoRepository;
import com.mv_services.backend.repository.PaqueteRepository;
import com.mv_services.backend.security.CurrentUserService;
import com.mv_services.backend.service.ConsolidadoOpsService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/consolidados")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('consolidados.read')")
public class ConsolidadoController {

    private final ConsolidadoRepository consolidadoRepository;
    private final PaqueteRepository paqueteRepository;
    private final CurrentUserService currentUserService;
    private final ConsolidadoOpsService consolidadoOpsService;

    public ConsolidadoController(
            ConsolidadoRepository consolidadoRepository,
            PaqueteRepository paqueteRepository,
            CurrentUserService currentUserService,
            ConsolidadoOpsService consolidadoOpsService
    ) {
        this.consolidadoRepository = consolidadoRepository;
        this.paqueteRepository = paqueteRepository;
        this.currentUserService = currentUserService;
        this.consolidadoOpsService = consolidadoOpsService;
    }

    @GetMapping
    public List<Consolidado> getAll() {
        if (currentUserService.isRole("SHIPPER")) {
            Usuario u = currentUserService.getCurrentUser();
            if (u == null || u.getShipper() == null) return List.of();
            List<Consolidado> consolidados = consolidadoRepository.findByPaquetesShipperId(u.getShipper().getId());
            Long shipperId = u.getShipper().getId();
            for (Consolidado c : consolidados) {
                c.setPaquetes(
                        c.getPaquetes().stream()
                                .filter(p -> p.getShipper() != null && p.getShipper().getId().equals(shipperId))
                                .toList()
                );
            }
            return consolidados;
        }
        return consolidadoRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Consolidado> getById(@PathVariable Long id) {
        var opt = consolidadoRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        Consolidado consolidado = opt.get();

        if (currentUserService.isRole("SHIPPER")) {
            Usuario u = currentUserService.getCurrentUser();
            if (u == null || u.getShipper() == null) return ResponseEntity.notFound().build();
            Long shipperId = u.getShipper().getId();

            List<Paquete> shipperPaquetes = consolidado.getPaquetes().stream()
                    .filter(p -> p.getShipper() != null && p.getShipper().getId().equals(shipperId))
                    .toList();

            if (shipperPaquetes.isEmpty()) return ResponseEntity.notFound().build();

            consolidado.setPaquetes(shipperPaquetes);
        }

        return ResponseEntity.ok(consolidado);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('consolidados.create')")
    public Consolidado create(@RequestBody(required = false) Consolidado consolidado) {
        Consolidado nuevo = new Consolidado();
        if (consolidado != null) {
            nuevo.setNumeroGuia(consolidado.getNumeroGuia());
        }
        nuevo.setEstado(ConsolidadoEstado.ABIERTO);
        nuevo.setPesoTotalLbs(0d);
        return consolidadoRepository.save(nuevo);
    }

    @PostMapping("/{id}/paquetes/{paqueteId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('consolidados.add_paquete')")
    public ResponseEntity<Consolidado> addPaquete(@PathVariable Long id, @PathVariable Long paqueteId) {
        Consolidado consolidado = consolidadoOpsService.addPaquete(id, paqueteId);
        return ResponseEntity.ok(consolidado);
    }

    @DeleteMapping("/{id}/paquetes/{paqueteId}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('consolidados.add_paquete')")
    public ResponseEntity<Consolidado> removePaquete(@PathVariable Long id, @PathVariable Long paqueteId) {
        Consolidado consolidado = consolidadoOpsService.removePaquete(id, paqueteId);
        return ResponseEntity.ok(consolidado);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('consolidados.create')")
    public ResponseEntity<Consolidado> update(@PathVariable Long id, @RequestBody Consolidado details) {
        return consolidadoRepository.findById(id)
                .map(c -> {
                    if (details.getNumeroGuia() != null) {
                        c.setNumeroGuia(details.getNumeroGuia());
                    }
                    consolidadoOpsService.recalcularTotales(c);
                    return ResponseEntity.ok(consolidadoRepository.save(c));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/abrir")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('consolidados.cerrar')")
    public ResponseEntity<Consolidado> abrir(@PathVariable Long id) {
        return consolidadoRepository.findById(id)
                .map(c -> {
                    c.setEstado(ConsolidadoEstado.ABIERTO);
                    consolidadoOpsService.recalcularTotales(c);
                    return ResponseEntity.ok(consolidadoRepository.save(c));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/cerrar")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('consolidados.cerrar')")
    public ResponseEntity<Consolidado> cerrar(@PathVariable Long id, @RequestBody Consolidado details) {
        return consolidadoRepository.findById(id)
                .map(c -> {
                    if (details.getNumeroGuia() != null) {
                        c.setNumeroGuia(details.getNumeroGuia());
                    }
                    c.setEstado(ConsolidadoEstado.CERRADO);
                    consolidadoOpsService.recalcularTotales(c);
                    return ResponseEntity.ok(consolidadoRepository.save(c));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('consolidados.delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!consolidadoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        List<Paquete> paquetes = paqueteRepository.findByConsolidadoId(id);
        for (Paquete p : paquetes) {
            p.setConsolidado(null);
            p.setPosicionEnConsolidado(null);
            paqueteRepository.save(p);
        }

        consolidadoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}
