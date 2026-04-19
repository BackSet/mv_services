package com.mv_services.backend.repository;

import com.mv_services.backend.model.Shipper;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShipperRepository extends JpaRepository<Shipper, Long> {
    @EntityGraph(attributePaths = {"telefonos", "direcciones"})
    List<Shipper> findAll();

    @EntityGraph(attributePaths = {"telefonos", "direcciones"})
    Optional<Shipper> findById(Long id);
}

