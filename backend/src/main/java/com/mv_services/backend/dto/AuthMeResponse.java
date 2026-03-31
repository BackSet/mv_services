package com.mv_services.backend.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthMeResponse {
    private String username;
    private String email;
    private String rol;
    private List<String> permisos;
    private Long shipperId;
    private String shipperNombre;
}

