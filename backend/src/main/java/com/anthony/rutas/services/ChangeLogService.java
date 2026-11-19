package com.anthony.rutas.services;

import com.anthony.rutas.entities.ChangeLog;
import com.anthony.rutas.repositories.ChangeLogRepository;
import com.anthony.rutas.security.OperatorPrincipal;
import com.anthony.rutas.security.OperatorScope;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChangeLogService {

    private final ChangeLogRepository changeLogRepository;
    private final OperatorScope operatorScope;

    @Transactional(readOnly = true)
    public List<ChangeLog> listForOperator(UUID operatorId) {
        return changeLogRepository.findTop100ByOperatorIdOrderByCreatedAtDesc(operatorId);
    }

    @Transactional
    public void record(String entityType, UUID entityId, String field, Object oldValue, Object newValue) {
        OperatorPrincipal principal = operatorScope.requirePrincipal();
        changeLogRepository.save(ChangeLog.builder()
                .operatorId(principal.getOperatorId())
                .entityType(entityType)
                .entityId(entityId)
                .field(field)
                .oldValue(oldValue == null ? null : String.valueOf(oldValue))
                .newValue(newValue == null ? null : String.valueOf(newValue))
                .authorEmail(principal.getUsername())
                .authorRole(principal.getOperatorRole())
                .build());
    }
}
