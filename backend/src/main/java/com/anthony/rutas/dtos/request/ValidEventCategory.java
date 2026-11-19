package com.anthony.rutas.dtos.request;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Rejects an event category outside the controlled list at the validation layer. */
@Documented
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = EventCategoryValidator.class)
public @interface ValidEventCategory {

    String message() default "Invalid event category";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
