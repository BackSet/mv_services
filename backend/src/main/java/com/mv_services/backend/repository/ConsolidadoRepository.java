package com.mv_services.backend.repository;

import com.mv_services.backend.model.Consolidado;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsolidadoRepository extends JpaRepository<Consolidado, Long> {

    @Query("SELECT DISTINCT c FROM Consolidado c JOIN c.paquetes p WHERE p.shipper.id = :shipperId")
    List<Consolidado> findByPaquetesShipperId(@Param("shipperId") Long shipperId);
}

