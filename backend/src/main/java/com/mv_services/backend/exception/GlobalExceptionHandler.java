package com.mv_services.backend.exception;

import com.mv_services.backend.service.AuthService.ShipperSolicitudPendienteException;
import com.mv_services.backend.service.AuthService.ShipperSolicitudRechazadaException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        String message = ex.getBindingResult().getAllErrors().stream()
                .findFirst()
                .map(error -> {
                    if (error instanceof FieldError fieldError) {
                        return fieldError.getField() + ": " + fieldError.getDefaultMessage();
                    }
                    return error.getDefaultMessage();
                })
                .orElse("Datos invalidos.");
        return errorResponse(HttpStatus.BAD_REQUEST, message, request, null);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest request
    ) {
        return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request, null);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(
            EntityNotFoundException ex,
            HttpServletRequest request
    ) {
        return errorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request, null);
    }

    @ExceptionHandler(ShipperSolicitudPendienteException.class)
    public ResponseEntity<Map<String, Object>> handleSolicitudPendiente(
            ShipperSolicitudPendienteException ex,
            HttpServletRequest request
    ) {
        return errorResponse(
                HttpStatus.FORBIDDEN,
                ex.getMessage(),
                request,
                "SHIPPER_SOLICITUD_PENDIENTE"
        );
    }

    @ExceptionHandler(ShipperSolicitudRechazadaException.class)
    public ResponseEntity<Map<String, Object>> handleSolicitudRechazada(
            ShipperSolicitudRechazadaException ex,
            HttpServletRequest request
    ) {
        ResponseEntity<Map<String, Object>> base = errorResponse(
                HttpStatus.FORBIDDEN,
                ex.getMessage(),
                request,
                "SHIPPER_SOLICITUD_RECHAZADA"
        );
        if (ex.getMotivo() == null || ex.getMotivo().isBlank()) {
            return base;
        }
        Map<String, Object> payload = new java.util.HashMap<>(base.getBody());
        payload.put("motivo", ex.getMotivo());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(payload);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(
            AuthenticationException ex,
            HttpServletRequest request
    ) {
        return errorResponse(HttpStatus.UNAUTHORIZED, "Usuario o contrasena invalidos.", request, "AUTH_INVALID");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            AccessDeniedException ex,
            HttpServletRequest request
    ) {
        return errorResponse(HttpStatus.FORBIDDEN, "No tienes permisos para esta operacion.", request, "ACCESS_DENIED");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request
    ) {
        return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request, null);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(
            IllegalStateException ex,
            HttpServletRequest request
    ) {
        return errorResponse(HttpStatus.CONFLICT, ex.getMessage(), request, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(
            Exception ex,
            HttpServletRequest request
    ) {
        return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Error interno del servidor.", request, null);
    }

    private ResponseEntity<Map<String, Object>> errorResponse(
            HttpStatus status,
            String message,
            HttpServletRequest request,
            String code
    ) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("timestamp", Instant.now().toString());
        payload.put("status", status.value());
        payload.put("error", status.getReasonPhrase());
        payload.put("message", message);
        payload.put("path", request.getRequestURI());
        if (code != null) {
            payload.put("code", code);
        }
        return ResponseEntity.status(status).body(payload);
    }
}

