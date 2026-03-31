package com.mv_services.backend.security;

import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UsuarioRepository usuarioRepository;

    public Usuario getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return null;
        }
        return usuarioRepository.findByUsername(auth.getName()).orElse(null);
    }

    public String getCurrentRoleName() {
        Usuario u = getCurrentUser();
        if (u == null || u.getRol() == null) return null;
        return u.getRol().getNombre();
    }

    public boolean isRole(String roleName) {
        String rn = getCurrentRoleName();
        return rn != null && rn.equalsIgnoreCase(roleName);
    }
}

