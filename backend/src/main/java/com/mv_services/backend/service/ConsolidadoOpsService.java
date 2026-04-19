package com.mv_services.backend.service;

import com.mv_services.backend.model.Consolidado;
import com.mv_services.backend.model.Paquete;
import com.mv_services.backend.repository.ConsolidadoRepository;
import com.mv_services.backend.repository.PaqueteRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConsolidadoOpsService {

    private final ConsolidadoRepository consolidadoRepository;
    private final PaqueteRepository paqueteRepository;

    @Transactional
    public Consolidado addPaquete(Long consolidadoId, Long paqueteId) {
        Consolidado consolidado = consolidadoRepository.findById(consolidadoId)
                .orElseThrow(() -> new EntityNotFoundException("Consolidado no encontrado: " + consolidadoId));
        Paquete paquete = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new EntityNotFoundException("Paquete no encontrado: " + paqueteId));

        if (paquete.getConsolidado() != null && paquete.getConsolidado().getId().equals(consolidadoId)) {
            throw new IllegalStateException("El paquete ya pertenece al consolidado.");
        }

        paquete.setConsolidado(consolidado);
        int nextPos = paqueteRepository.findByConsolidadoId(consolidadoId).size() + 1;
        paquete.setPosicionEnConsolidado(nextPos);
        paqueteRepository.save(paquete);

        reordenarPosiciones(consolidadoId);
        recalcularTotales(consolidado);
        return consolidadoRepository.save(consolidado);
    }

    @Transactional
    public Consolidado removePaquete(Long consolidadoId, Long paqueteId) {
        Consolidado consolidado = consolidadoRepository.findById(consolidadoId)
                .orElseThrow(() -> new EntityNotFoundException("Consolidado no encontrado: " + consolidadoId));
        Paquete paquete = paqueteRepository.findById(paqueteId)
                .orElseThrow(() -> new EntityNotFoundException("Paquete no encontrado: " + paqueteId));

        if (paquete.getConsolidado() == null || !paquete.getConsolidado().getId().equals(consolidadoId)) {
            throw new IllegalStateException("El paquete no pertenece al consolidado.");
        }

        paquete.setConsolidado(null);
        paquete.setPosicionEnConsolidado(null);
        paqueteRepository.save(paquete);

        reordenarPosiciones(consolidadoId);
        recalcularTotales(consolidado);
        return consolidadoRepository.save(consolidado);
    }

    @Transactional
    public void recalcularTotales(Consolidado consolidado) {
        List<Paquete> paquetes = paqueteRepository.findByConsolidadoId(consolidado.getId());
        double lbs = 0d;
        for (Paquete p : paquetes) {
            if (p.getPesoLbs() != null) lbs += p.getPesoLbs();
        }
        consolidado.setPesoTotalLbs(lbs);
    }

    @Transactional
    public void reordenarPosiciones(Long consolidadoId) {
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

