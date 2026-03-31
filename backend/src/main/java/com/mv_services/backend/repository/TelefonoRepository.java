package com.mv_services.backend.repository;

import com.mv_services.backend.model.Telefono;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TelefonoRepository extends JpaRepository<Telefono, Long> {
    List<Telefono> findByShipperId(Long shipperId);
    Optional<Telefono> findByIdAndShipperId(Long id, Long shipperId);
}

