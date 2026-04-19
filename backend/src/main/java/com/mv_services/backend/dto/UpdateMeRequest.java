package com.mv_services.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMeRequest {

    @NotBlank
    @Size(min = 3, max = 32)
    @Pattern(regexp = "^[a-zA-Z0-9._-]{3,32}$",
            message = "Sólo letras, números, punto, guion y guion bajo (3–32).")
    private String username;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;
}
