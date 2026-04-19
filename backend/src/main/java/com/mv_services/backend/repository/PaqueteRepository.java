package com.mv_services.backend.repository;

import com.mv_services.backend.model.Paquete;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaqueteRepository extends JpaRepository<Paquete, Long> {
    Optional<Paquete> findByNumeroGuia(String numeroGuia);
    List<Paquete> findByConsolidadoId(Long consolidadoId);
    List<Paquete> findByShipperId(Long shipperId);
    Optional<Paquete> findByIdAndShipperId(Long id, Long shipperId);

    /**
     * Obtiene los paquetes de un consolidado ordenados por posición (asc),
     * usando id como fallback determinista cuando la posición es null.
     */
    List<Paquete> findByConsolidadoIdOrderByPosicionEnConsolidadoAscIdAsc(Long consolidadoId);
}
