package com.anthony.rutas.dtos.request;

import com.anthony.rutas.services.EventCategory;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/** Bean Validation bridge to the {@link EventCategory} controlled vocabulary. */
public class EventCategoryValidator implements ConstraintValidator<ValidEventCategory, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value != null && EventCategory.isValid(value);
    }
}
