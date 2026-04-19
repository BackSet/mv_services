package com.mv_services.backend.controller;

import com.mv_services.backend.model.Consolidado;
import com.mv_services.backend.model.ConsolidadoEstado;
import com.mv_services.backend.model.Paquete;
import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.ConsolidadoRepository;
import com.mv_services.backend.repository.PaqueteRepository;
import com.mv_services.backend.security.CurrentUserService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/consolidados")
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN','SHIPPER') or hasAuthority('consolidados.read') or hasAuthority('consolidados.add_paquete')")
public class ConsolidadoController {

    private final ConsolidadoRepository consolidadoRepository;
    private final PaqueteRepository paqueteRepository;
    private final CurrentUserService currentUserService;

    public ConsolidadoController(
            ConsolidadoRepository consolidadoRepository,
            PaqueteRepository paqueteRepository,
            CurrentUserService currentUserService
    ) {
        this.consolidadoRepository = consolidadoRepository;
        this.paqueteRepository = paqueteRepository;
        this.currentUserService = currentUserService;
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
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
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
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN') or hasAuthority('consolidados.add_paquete')")
    public ResponseEntity<Consolidado> addPaquete(@PathVariable Long id, @PathVariable Long paqueteId) {
        Consolidado consolidado = consolidadoRepository.findById(id).orElse(null);
        if (consolidado == null) return ResponseEntity.notFound().build();

        Paquete paquete = paqueteRepository.findById(paqueteId).orElse(null);
        if (paquete == null) return ResponseEntity.notFound().build();

        if (paquete.getConsolidado() != null && paquete.getConsolidado().getId().equals(id)) {
            return ResponseEntity.badRequest().build();
        }

        paquete.setConsolidado(consolidado);
        // Asigna la siguiente posición disponible al final de la lista.
        int nextPos = paqueteRepository.findByConsolidadoId(id).size() + 1;
        paquete.setPosicionEnConsolidado(nextPos);
        paqueteRepository.save(paquete);

        reordenarPosiciones(id);
        recalcularTotales(consolidado);
        return ResponseEntity.ok(consolidadoRepository.save(consolidado));
    }

    @DeleteMapping("/{id}/paquetes/{paqueteId}")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN') or hasAuthority('consolidados.add_paquete')")
    public ResponseEntity<Consolidado> removePaquete(@PathVariable Long id, @PathVariable Long paqueteId) {
        Consolidado consolidado = consolidadoRepository.findById(id).orElse(null);
        if (consolidado == null) return ResponseEntity.notFound().build();

        Paquete paquete = paqueteRepository.findById(paqueteId).orElse(null);
        if (paquete == null) return ResponseEntity.notFound().build();

        if (paquete.getConsolidado() == null || !paquete.getConsolidado().getId().equals(id)) {
            return ResponseEntity.badRequest().build();
        }

        paquete.setConsolidado(null);
        paquete.setPosicionEnConsolidado(null);
        paqueteRepository.save(paquete);

        reordenarPosiciones(id);
        recalcularTotales(consolidado);
        return ResponseEntity.ok(consolidadoRepository.save(consolidado));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<Consolidado> update(@PathVariable Long id, @RequestBody Consolidado details) {
        return consolidadoRepository.findById(id)
                .map(c -> {
                    if (details.getNumeroGuia() != null) {
                        c.setNumeroGuia(details.getNumeroGuia());
                    }
                    recalcularTotales(c);
                    return ResponseEntity.ok(consolidadoRepository.save(c));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/abrir")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<Consolidado> abrir(@PathVariable Long id) {
        return consolidadoRepository.findById(id)
                .map(c -> {
                    c.setEstado(ConsolidadoEstado.ABIERTO);
                    recalcularTotales(c);
                    return ResponseEntity.ok(consolidadoRepository.save(c));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/cerrar")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<Consolidado> cerrar(@PathVariable Long id, @RequestBody Consolidado details) {
        return consolidadoRepository.findById(id)
                .map(c -> {
                    if (details.getNumeroGuia() != null) {
                        c.setNumeroGuia(details.getNumeroGuia());
                    }
                    c.setEstado(ConsolidadoEstado.CERRADO);
                    recalcularTotales(c);
                    return ResponseEntity.ok(consolidadoRepository.save(c));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
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

    /**
     * Recalcula la suma de pesos del consolidado a partir de las libras
     * de cada paquete. El total en kgs se deriva en la entidad.
     */
    private void recalcularTotales(Consolidado consolidado) {
        List<Paquete> paquetes = paqueteRepository.findByConsolidadoId(consolidado.getId());
        double lbs = 0d;
        for (Paquete p : paquetes) {
            if (p.getPesoLbs() != null) lbs += p.getPesoLbs();
        }
        consolidado.setPesoTotalLbs(lbs);
    }

    /**
     * Recompacta las posiciones de los paquetes de un consolidado en orden ascendente,
     * eliminando huecos producidos al quitar elementos. Conserva el orden actual
     * (por posición previa o por id como fallback).
     */
    private void reordenarPosiciones(Long consolidadoId) {
        List<Paquete> paquetes =
                paqueteRepository.findByConsolidadoIdOrderByPosicionEnConsolidadoAscIdAsc(consolidadoId);
        int pos = 1;
        for (Paquete p : paquetes) {
            Integer current = p.getPosicionEnConsolidado();
            if (current == null || current != pos) {
                p.setPosicionEnConsolidado(pos);
                paqueteRepository.save(p);
            }
            pos++;
        }
    }
}
