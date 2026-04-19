package com.mv_services.backend.repository;

import com.mv_services.backend.model.Telefono;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TelefonoRepository extends JpaRepository<Telefono, Long> {
    List<Telefono> findByShipperId(Long shipperId);
    Optional<Telefono> findByIdAndShipperId(Long id, Long shipperId);

    @Modifying
    @Query("UPDATE Telefono t SET t.esPrincipal = false WHERE t.shipper.id = :shipperId")
    int clearPrincipalByShipperId(@Param("shipperId") Long shipperId);

    @Modifying
    @Query("UPDATE Telefono t SET t.esPrincipal = false WHERE t.shipper.id = :shipperId AND t.id <> :telefonoId")
    int clearPrincipalByShipperIdExcludingTelefonoId(@Param("shipperId") Long shipperId, @Param("telefonoId") Long telefonoId);
}

