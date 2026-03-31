package com.mv_services.backend.repository;

import com.mv_services.backend.model.DireccionShipper;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DireccionShipperRepository extends JpaRepository<DireccionShipper, Long> {
    List<DireccionShipper> findByShipperId(Long shipperId);
    Optional<DireccionShipper> findByIdAndShipperId(Long id, Long shipperId);
}

