# Guía para contactar empresas de transporte y recopilar datos reales — RutaYa

Esta guía sirve para que el equipo de RutaYa contacte a las empresas de transporte, explique qué necesita y recoja la información operativa mínima para publicar rutas, paraderos, tarifas, horarios y frecuencias en la aplicación. Incluye el discurso, el proceso, los campos exactos que consume la app, reglas de calidad, validación en campo, plantillas de correo/WhatsApp/llamada y una carta de autorización.

> **Alcance:** solo datos operativos y públicos de la empresa (recorridos, paraderos, tarifas, horarios). No se solicitan datos personales de conductores ni pasajeros, información financiera, ni datos de demanda.

---

## Ruta rápida

1. Elegir la empresa y el contacto correcto (operaciones o gerencia).
2. Enviar el correo del **Anexo A** o el mensaje del **Anexo B**.
3. Agendar una entrevista de 30 minutos y una vuelta de reconocimiento.
4. Recibir los datos en el formato de la **sección 6** (CSV/Excel + geometría).
5. Validar en campo según la **sección 8** y firmar la autorización del **Anexo D**.
6. Acordar el canal y la frecuencia de actualización.

---

## 1. Objetivo y resultado esperado

Al cerrar el contacto con una empresa debemos poder responder, sin volver a llamarla:

| Resultado | Evidencia concreta |
|---|---|
| Empresa y línea identificadas | Razón social, nombre comercial, código de línea, contacto operativo |
| Rutas publicables | Código único, nombre, tarifa, horario, frecuencia y estado |
| Recorridos por sentido | Ida y vuelta con origen, destino, distancia y duración |
| Paraderos georreferenciados | Nombre, latitud/longitud, referencia, dirección y accesibilidad |
| Geometría del recorrido | Trazo continuo de la ruta en mapa (GeoJSON/GPX/KML) |
| Autorización de publicación | Carta firmada y responsable de actualizaciones |
| Compromiso de actualización | Canal, frecuencia y contacto para correcciones |

**Criterio de éxito:** con esos datos se puede crear la línea, la ruta, sus dos sentidos, los paraderos ordenados y el trazo en el mapa sin inventar ni completar información crítica.

---

## 2. A quién contactar

| Orden | Rol | Por qué |
|---|---|---|
| 1 | Gerente de operaciones / tráfico | Es quien conoce recorridos, horarios y frecuencias reales |
| 2 | Jefe de flota | Aporta vehículos, capacidad y estado operativo |
| 3 | Área de sistemas / TI | Necesaria si entregan GPS, GTFS o una integración |
| 4 | Comunicaciones / marketing | Aprueba el uso de marca, color y logo |
| 5 | Legal / gerencia general | Firma la autorización de publicación |
| Alternativa | Gerencia de Transporte de la municipalidad | Sirve para identificar empresas y rutas autorizadas cuando la empresa no responde |

**Recomendación:** pedir en el primer contacto a la persona correcta, no a la recepcionista. Frase útil: *"Necesito coordinar con el área de operaciones o tráfico; es sobre los recorridos y paraderos que operan."*

---

## 3. Discurso de la propuesta de valor

### Versión de 30 segundos

> RutaYa es una aplicación gratuita que ayuda a los pasajeros a encontrar qué ruta tomar, dónde está el paradero y cuánto cuesta. Para que la información sea confiable necesitamos publicar los recorridos, paraderos, horarios y tarifas reales de su empresa. Nosotros digitalizamos y mantenemos los datos; ustedes solo validan. No tiene costo y la empresa aparece identificada como fuente oficial.

### Qué gana la empresa

- Visibilidad gratuita ante pasajeros que buscan su ruta.
- Información correcta publicada (menos consultas repetidas en sus canales).
- Un canal para comunicar cambios, desvíos y paralizaciones.
- Sin exclusividad ni cesión de marca más allá de lo autorizado.

### Qué pedimos

- Una entrevista de 30 minutos.
- Los datos operativos de la **sección 5** y las plantillas de la **sección 6**.
- Una vuelta de reconocimiento para validar paraderos.
- Autorización escrita para publicar los datos operativos.

---

## 4. Proceso de contacto en cinco etapas

| Etapa | Objetivo | Acción | Salida |
|---|---|---|---|
| 1. Preparación | Llegar con contexto | Investigar la empresa, rutas visibles y cobertura en la ciudad | Ficha preliminar y hipótesis de rutas |
| 2. Primer contacto | Conseguir al responsable | Correo + WhatsApp + llamada de seguimiento | Nombre, cargo y reunión agendada |
| 3. Entrevista | Entender la operación | Preguntas del **Anexo F** | Datos operativos y acuerdos |
| 4. Recepción y validación | Confirmar que los datos sirven | Revisión de calidad + vuelta de campo | Dataset aprobado |
| 5. Formalización | Asegurar uso y actualización | Carta del **Anexo D** y acuerdo de actualización | Autorización firmada y contacto vigente |

**Cadencia de seguimiento sugerida:** día 0 (envío), día 3 (recordatorio por WhatsApp), día 7 (llamada), día 15 (cierre o descarte temporal). Registrar todo en el **Anexo G**.

---

## 5. Datos requeridos por la aplicación

Los campos de esta sección son los que hoy consume el backend de RutaYa. La columna **Obligatorio** indica si el dato es imprescindible para publicar.

### 5.1 Empresa y línea de transporte

Corresponde a la entidad `TransportLine`.

| Campo en la app | Dato a solicitar | Formato | Obligatorio | Ejemplo | Para qué |
|---|---|---|---|---|---|
| `company` | Razón social o nombre de la empresa | Texto | Sí | Consorcio Urbano Ica S.A.C. | Identificar al operador |
| `name` | Nombre comercial de la línea | Texto | Sí | Línea 1: Consorcio Urbano | Mostrar la línea al pasajero |
| `code` | Código corto de la línea | Texto ≤ 20 | Sí | L1 | Búsqueda y referencia rápida |
| `contact` | Teléfono y correo operativo | Texto | Sí | 056 234-567 / operaciones@… | Canal para cambios y correcciones |
| `color` | Color representativo de la línea | HEX `#RRGGBB` | Deseable | #2563EB | Diferenciar la línea en el mapa |
| `description` | Descripción breve del servicio | Texto | Deseable | Servicio urbano regular | Contexto para el usuario |
| `status` | Estado de la línea | `ACTIVE` / `INACTIVE` | Sí | ACTIVE | No mostrar líneas suspendidas |
| `city` | Ciudad y país de operación | Texto | Sí | Ica, Perú | Filtro por ciudad |

### 5.2 Ruta

Corresponde a la entidad `Route`.

| Campo en la app | Dato a solicitar | Formato | Obligatorio | Ejemplo | Para qué |
|---|---|---|---|---|---|
| `code` | Código único de la ruta | Texto | Sí | R101 | Identificar la ruta sin ambigüedad |
| `name` | Nombre de la ruta | Texto | Sí | Plaza de Armas – Huacachina | Búsqueda y tarjeta de ruta |
| `fare` | Tarifa vigente | Texto con monto y moneda | Sí | S/ 1.50 | Mostrar el costo al pasajero |
| `schedule` | Horario de operación | `HH:MM - HH:MM` | Sí | 06:00 - 21:00 | Saber si la ruta está disponible |
| `frequency` | Frecuencia entre unidades | Texto | Sí | Cada 15 min | Estimar la espera |
| `description` | Descripción del recorrido | Texto | Deseable | Recorre Av. Municipalidad y Av. Cutervo | Contexto |
| `color` | Color de la ruta en el mapa | HEX `#RRGGBB` | Deseable | #E8532E | Diferenciar rutas |
| `status` | Estado de la ruta | `ACTIVE` / `INACTIVE` | Sí | ACTIVE | No publicar rutas suspendidas |

> `popularityScore` es un dato interno de la app. **No se solicita** a la empresa.

### 5.3 Recorrido por sentido

Cada ruta debe entregarse en dos sentidos: ida y vuelta. Corresponde a `RouteDirection`.

| Campo en la app | Dato a solicitar | Formato | Obligatorio | Ejemplo |
|---|---|---|---|---|
| `direction` | Sentido del recorrido | `INBOUND` (ida) / `OUTBOUND` (vuelta) | Sí | INBOUND |
| `originName` | Punto de inicio | Texto | Sí | Plaza de Armas |
| `destinationName` | Punto final | Texto | Sí | Huacachina |
| `totalDistanceKm` | Distancia total del sentido | Número, km | Deseable | 7.2 |
| `estimatedMinutes` | Duración estimada | Entero, minutos | Deseable | 25 |

**Regla:** si la ida y la vuelta no son simétricas (recorridos distintos, paraderos distintos), se registran como dos recorridos separados. No se debe asumir que la vuelta es el inverso exacto.

### 5.4 Paraderos

Corresponde a la entidad `Stop`.

| Campo en la app | Dato a solicitar | Formato | Obligatorio | Ejemplo |
|---|---|---|---|---|
| `name` | Nombre del paradero | Texto | Sí | Plaza de Armas de Ica |
| `latitude` | Latitud | Decimal WGS84 | Sí | -14.067800 |
| `longitude` | Longitud | Decimal WGS84 | Sí | -75.728600 |
| `reference` | Referencia visible | Texto | Sí | Frente a la Municipalidad |
| `address` | Dirección | Texto | Deseable | Av. Municipalidad cdra 1 |
| `accessible` | ¿Es accesible? | Sí / No | Sí | Sí |
| `keyStop` | ¿Es paradero principal? | Sí / No | Deseable | Sí |
| `imageUrl` | Foto referencial del paradero | JPG/PNG | Deseable | (foto tomada en campo) |

**Regla:** un paradero se registra una sola vez aunque lo usen varias rutas. La relación ruta–paradero se hace por orden, no duplicando el paradero.

### 5.5 Orden de paraderos y geometría

Corresponde a `RouteStop` y `RoutePoint`.

| Campo en la app | Dato a solicitar | Formato | Obligatorio | Ejemplo |
|---|---|---|---|---|
| `stopOrder` | Orden del paradero dentro del sentido | Entero desde 1 | Sí | 1, 2, 3… |
| `distanceFromStart` | Distancia acumulada desde el inicio | Número, km | Deseable | 0.0 |
| `pointOrder` | Orden de los puntos del trazo | Entero desde 1 | Sí, si hay geometría | 1, 2, 3… |
| `location` | Coordenadas del trazo | Lista ordenada de `[lat, lng]` | Sí, si hay geometría | [[-14.0678,-75.7286], …] |

**Formatos aceptados para la geometría, en orden de preferencia:**

1. **GTFS** (`stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `shapes.txt`).
2. **GeoJSON** con un `LineString` por ruta y sentido.
3. **GPX o KML** exportado desde Google Maps, GPS o aplicación de campo.
4. **Captura con GPS** durante la vuelta de reconocimiento (se procesa internamente).

### 5.6 Flota y seguimiento en tiempo real (fase 2)

Corresponde a `Vehicle` y `VehicleLocation`. No es necesario para publicar rutas, pero conviene preguntarlo desde el inicio.

| Campo en la app | Dato a solicitar | Formato | Ejemplo |
|---|---|---|---|
| `plate` | Placa del vehículo | Texto | V1A-234 |
| `internalCode` | Código interno | Texto | BUS-014 |
| `status` | Estado del vehículo | `ACTIVE` / `INACTIVE` | ACTIVE |
| `latitude` / `longitude` | Posición GPS | Decimal WGS84 | -14.0678 / -75.7286 |
| `speed` | Velocidad | Número, km/h | 32.5 |
| `heading` | Rumbo | Grados 0–360 | 180 |
| `recordedAt` | Marca de tiempo | ISO 8601 | 2026-10-19T14:32:00-05:00 |

**Preguntas clave de integración:** ¿la empresa ya tiene GPS? ¿Qué proveedor? ¿Puede exponer una API o GTFS-RT? ¿Cada cuántos segundos publica? ¿Requiere autenticación o IP autorizada?

### 5.7 Datos operativos complementarios

Aunque la app hoy los muestra como texto libre, conviene pedirlos estructurados para no volver a contactar a la empresa:

| Dato | Formato sugerido | Por qué |
|---|---|---|
| Horario por día (lunes a domingo y feriados) | Tabla día → `HH:MM - HH:MM` | Los horarios cambian por día |
| Frecuencia por franja (punta / valle) | Tabla franja → minutos | La frecuencia no es constante |
| Tarifas diferenciadas (general, estudiante, adulto mayor) | Monto + moneda + condición + vigencia | Evitar tarifas desactualizadas |
| Medios de pago | Efectivo / tarjeta / billetera / app | Información útil al pasajero |
| Capacidad y tipo de vehículo | Número de pasajeros, tipo | Contexto del servicio |
| Accesibilidad del vehículo | Rampa, espacio para silla, anuncio sonoro | Complementa `accessible` |
| Restricciones y desvíos frecuentes | Texto + vigencia | Alertas operativas |
| Puntos de venta o recarga | Nombre + dirección + horario | Información de viaje |
| Canales de atención al pasajero | Teléfono, WhatsApp, web | Derivar consultas |
| Responsable de actualizar datos | Nombre, cargo, correo, teléfono | Mantener la información vigente |

---

## 6. Formato de entrega

| Prioridad | Formato | Cuándo usarlo |
|---|---|---|
| 1 | GTFS | La empresa o su proveedor ya lo genera |
| 2 | CSV/Excel + GeoJSON | Caso más común: datos en planillas y trazo en mapa |
| 3 | GPX/KML | La empresa tiene el recorrido en Google Maps o GPS |
| 4 | Papel, PDF o foto | Solo como insumo; el equipo lo digitaliza y valida en campo |

**No aceptar como entrega final:** capturas de pantalla sin coordenadas, listas de nombres sin ubicación, o un croquis sin escala. Sirven para preparar la visita, no para publicar.

### Plantillas CSV

**`lineas.csv`**

```csv
ciudad,pais,empresa,codigo_linea,nombre_linea,color_hex,contacto,descripcion,estado
Ica,Perú,Consorcio Urbano Ica S.A.C.,L1,Línea 1: Consorcio Urbano,#2563EB,056 234-567,Servicio urbano regular,ACTIVE
```

**`rutas.csv`**

```csv
empresa,codigo_linea,codigo_ruta,nombre_ruta,color_hex,tarifa_texto,monto_tarifa,moneda,vigencia_tarifa,horario,frecuencia,estado,descripcion
Consorcio Urbano Ica S.A.C.,L1,R101,Plaza de Armas – Huacachina,#E8532E,S/ 1.50,1.50,PEN,2026-10-01,06:00 - 21:00,Cada 15 min,ACTIVE,Recorre Av. Municipalidad y Av. Cutervo
```

**`recorridos.csv`**

```csv
codigo_ruta,sentido,origen,destino,distancia_km,duracion_min
R101,INBOUND,Plaza de Armas,Huacachina,7.2,25
R101,OUTBOUND,Huacachina,Plaza de Armas,7.4,27
```

**`paraderos.csv`**

```csv
codigo_ruta,sentido,orden,nombre,latitud,longitud,referencia,direccion,accesible,paradero_clave
R101,INBOUND,1,Plaza de Armas de Ica,-14.067800,-75.728600,Frente a la Municipalidad,Av. Municipalidad cdra 1,Sí,Sí
R101,INBOUND,2,Óvalo Grau,-14.070100,-75.731000,Costado del óvalo,Av. Grau cdra 2,No,No
```

**`geometria.geojson`** (un `LineString` por ruta y sentido)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "codigo_ruta": "R101", "sentido": "INBOUND" },
      "geometry": {
        "type": "LineString",
        "coordinates": [[-75.7286, -14.0678], [-75.7310, -14.0701]]
      }
    }
  ]
}
```

> **Atención al orden de coordenadas:** en GeoJSON el orden es `[longitud, latitud]`. En la app y en los CSV usamos columnas separadas `latitud` y `longitud` para evitar confusiones.

---

## 7. Reglas de calidad de datos

Antes de cargar cualquier dato, verificar:

- [ ] Coordenadas en **WGS84**, grados decimales, al menos 6 decimales.
- [ ] Cada paradero está en el **lado correcto de la vía** y en el punto de parada real, no en el centro del cruce.
- [ ] No hay paraderos duplicados a menos de 15 metros entre sí.
- [ ] Los nombres son consistentes entre rutas (mismo paradero, mismo nombre).
- [ ] El trazo es continuo: sin saltos mayores a 200 metros ni puntos fuera de la vía.
- [ ] La distancia y la duración son plausibles para la ciudad.
- [ ] La tarifa tiene monto, moneda y fecha de vigencia.
- [ ] Los horarios usan formato 24 horas `HH:MM`.
- [ ] El estado usa solo `ACTIVE` o `INACTIVE`.
- [ ] Cada ruta tiene **ida y vuelta** registradas por separado.
- [ ] El código de ruta es único dentro de la ciudad.
- [ ] La empresa confirmó qué rutas están suspendidas o cambiaron.

**Vocabulario controlado**

| Concepto | Valores permitidos |
|---|---|
| Estado | `ACTIVE`, `INACTIVE` |
| Sentido | `INBOUND` (ida), `OUTBOUND` (vuelta) |
| Accesible | Sí / No |
| Paradero clave | Sí / No |

---

## 8. Validación en campo

| Paso | Qué hacer | Criterio de aceptación |
|---|---|---|
| 1. Revisión de escritorio | Detectar duplicados, coordenadas fuera de rango, rutas incompletas | 0 errores bloqueantes |
| 2. Vuelta de reconocimiento | Recorrer la ruta completa en ambos sentidos con GPS activo | Trazo continuo y paraderos registrados |
| 3. Verificación por muestreo | Confirmar al menos 3 paraderos por ruta en el terreno | Nombre, ubicación y accesibilidad correctos |
| 4. Registro fotográfico | Foto del paradero y de la referencia visible | Imagen utilizable en la app |
| 5. Firma de validación | La empresa confirma los datos corregidos | Responsable identificado y fecha |

**Umbral recomendado:** 95 % de los paraderos georreferenciados con un error menor a 20 metros y 100 % de las rutas con ambos sentidos. Si no se alcanza, se corrige antes de publicar.

---

## 9. Aspectos legales y privacidad

- Solicitar autorización escrita para **publicar** los datos operativos en la app (Anexo D).
- Dejar claro que la empresa conserva la titularidad de su información y que RutaYa solo la usa para el servicio.
- Acordar si la empresa quiere ser identificada como fuente oficial o si prefiere aparecer solo con el nombre comercial.
- **No** solicitar ni almacenar datos personales de conductores, cobradores o pasajeros.
- Si se toman fotos en campo, evitar rostros y placas legibles; si aparecen, difuminarlos antes de publicar.
- Definir un responsable y un canal para solicitar correcciones o retiros de información.
- Registrar la fecha y la versión de los datos recibidos.

---

## 10. Acuerdo de actualización

| Tema | Acordar |
|---|---|
| Frecuencia | Mensual para tarifas y horarios; inmediata para desvíos, paralizaciones o cambios de recorrido |
| Canal | Correo o WhatsApp del responsable designado |
| Formato | Misma plantilla CSV o aviso simple de cambio |
| Plazo de respuesta | Confirmar recepción en 24 horas y publicar en un máximo de 72 horas |
| Historial | Registrar fecha, cambio y responsable |
| Contacto de emergencia | Nombre y teléfono para cambios urgentes |

**Frase para cerrar el acuerdo:** *"¿Quién de su equipo nos avisa si cambia una tarifa, un paradero o un recorrido, y por qué canal prefiere hacerlo?"*

---

## 11. Manejo de objeciones

| Objeción | Respuesta sugerida |
|---|---|
| "No tenemos la información digitalizada" | "No hay problema. Podemos digitalizarla nosotros a partir de sus planillas o mapas y validarla con una vuelta de reconocimiento." |
| "No tenemos tiempo" | "Solo necesitamos 30 minutos de entrevista y una vuelta de reconocimiento. El resto lo hacemos nosotros." |
| "Es información estratégica" | "Solo pedimos datos operativos que el pasajero ya ve: recorrido, paraderos, tarifa y horario. No pedimos demanda, ingresos ni información financiera." |
| "¿Nos van a cobrar?" | "No. La publicación es gratuita y la empresa aparece identificada." |
| "¿Quién más verá los datos?" | "Son datos públicos dentro de la app. Podemos acordar qué se publica y qué no, y ustedes pueden pedir correcciones." |
| "Ya tenemos GPS" | "Perfecto. En una segunda fase podemos evaluar una integración para mostrar la unidad en tiempo real." |
| "Tenemos miedo a la competencia" | "No publicamos información comercial sensible ni compartimos sus datos con otras empresas." |

---

## 12. Roles internos

| Rol | Responsabilidad |
|---|---|
| Líder de investigación | Identifica empresas, prioriza contactos y envía solicitudes |
| Entrevistador | Realiza la reunión y completa el cuestionario |
| Validador de campo | Recorre rutas, toma GPS y fotos, corrige paraderos |
| Responsable de datos | Revisa calidad, carga los datos y mantiene el historial |
| Responsable legal | Revisa y archiva la autorización firmada |

---

## Anexo A — Correo de primer contacto

**Asunto:** Solicitud de información operativa para RutaYa — {{NOMBRE_EMPRESA}}

```text
Estimado/a {{NOMBRE}}:
    Reciba un cordial saludo de parte de RutaYa, una aplicación gratuita que ayuda a los
pasajeros a ubicar rutas, paraderos, horarios y tarifas del transporte público.

Para publicar información confiable de {{NOMBRE_EMPRESA}}, necesitamos validar con ustedes
los recorridos, paraderos, tarifas, horarios y frecuencias de sus rutas. La información que
solicitamos es operativa y pública; no incluye datos personales ni información financiera.

Nos gustaría coordinar una reunión de 30 minutos con el área de operaciones o tráfico.
Nosotros nos encargamos de digitalizar y mantener los datos, y ustedes solo validan.

¿Podría indicarnos el nombre y contacto de la persona adecuada, y su disponibilidad para
esta semana?

Quedamos atentos.
    {{NOMBRE_REMITENTE}}
    {{CARGO}} — RutaYa
    {{TELÉFONO}} | {{CORREO}}
```

**Versión corta para WhatsApp**

```text
Hola, {{NOMBRE}}. Le escribo de RutaYa, la app gratuita de rutas de transporte.
Queremos publicar los recorridos, paraderos, tarifas y horarios reales de {{EMPRESA}}.
Solo necesitamos 30 minutos con el área de operaciones y una vuelta de reconocimiento.
Nosotros digitalizamos y mantenemos la información; ustedes validan. ¿Con quién puedo coordinar?
```

---

## Anexo B — Mensaje de WhatsApp / seguimiento

```text
Hola, {{NOMBRE}}. Soy {{REMITENTE}}, de RutaYa. Le escribí el {{FECHA}} sobre la publicación
de las rutas de {{EMPRESA}} en nuestra app gratuita. Quería confirmar si pudo revisar el correo
y si le parece bien una reunión breve de 30 minutos esta semana. Gracias.
```

---

## Anexo C — Guion telefónico

1. **Apertura:** "Buenos días, le habla {{NOMBRE}} de RutaYa. ¿Con quién puedo hablar sobre los recorridos y paraderos de sus rutas?"
2. **Propósito:** "Estamos publicando información de rutas en una app gratuita para pasajeros y queremos usar los datos reales de su empresa."
3. **Alcance:** "Necesitamos recorridos, paraderos, tarifas, horarios y frecuencia. No pedimos datos personales ni información financiera."
4. **Esfuerzo:** "Son 30 minutos de reunión y una vuelta de reconocimiento. La digitalización la hacemos nosotros."
5. **Cierre:** "¿Le parece si agendamos la reunión para esta semana? ¿Cuál es el correo y el nombre de la persona que debe participar?"

Si no es la persona correcta: "¿Podría transferirme al área de operaciones o darme su contacto directo?"

---

## Anexo D — Carta de autorización de uso de datos

```text
AUTORIZACIÓN DE USO DE INFORMACIÓN OPERATIVA

Por medio del presente documento, {{RAZÓN_SOCIAL}}, identificada con RUC {{RUC}},
con domicilio en {{DOMICILIO}}, representada por {{REPRESENTANTE}}, en su calidad de
{{CARGO}}, autoriza a RutaYa a publicar en su aplicación móvil y web la siguiente
información operativa de sus servicios de transporte:

- Nombre comercial de la empresa y de sus líneas.
- Recorridos y sentidos de las rutas.
- Paraderos y su ubicación geográfica.
- Tarifas, horarios y frecuencias.
- Información de accesibilidad y estado del servicio.

La autorización tiene carácter gratuito, no exclusivo y revocable, y se limita a la
publicación de la información operativa descrita. No comprende datos personales de
conductores o pasajeros, información financiera ni datos comerciales sensibles.

La empresa podrá solicitar correcciones o la eliminación de la información en cualquier
momento mediante comunicación a {{CORREO_DE_CONTACTO}}.

Responsable de actualización:
Nombre: {{NOMBRE}}
Cargo: {{CARGO}}
Correo: {{CORREO}}
Teléfono: {{TELÉFONO}}

Fecha: {{FECHA}}

Firma: ______________________________
Nombre: {{REPRESENTANTE}}
Cargo: {{CARGO}}
```

---

## Anexo E — Checklist de recepción de datos

- [ ] Nombre comercial, razón social, RUC y contacto operativo.
- [ ] Código y nombre de cada línea.
- [ ] Código único y nombre de cada ruta.
- [ ] Tarifa vigente con monto, moneda y fecha.
- [ ] Horario por día y frecuencia por franja.
- [ ] Ambos sentidos por ruta (`INBOUND` y `OUTBOUND`).
- [ ] Origen, destino, distancia y duración por sentido.
- [ ] Lista ordenada de paraderos por sentido.
- [ ] Coordenadas de cada paradero.
- [ ] Referencia, dirección y accesibilidad de cada paradero.
- [ ] Geometría del recorrido (GTFS, GeoJSON, GPX o KML).
- [ ] Rutas activas, suspendidas y próximas a cambiar.
- [ ] Fotos referenciales de paraderos (si están disponibles).
- [ ] Responsable de actualización y canal preferido.
- [ ] Carta de autorización firmada.

---

## Anexo F — Preguntas para la entrevista

**Operación**

1. ¿Cuántas líneas y rutas operan actualmente en la ciudad?
2. ¿Cuáles están activas y cuáles suspendidas?
3. ¿La ida y la vuelta son iguales o cambian paraderos?
4. ¿Hay rutas que comparten paraderos?
5. ¿Hay desvíos o restricciones frecuentes?

**Horarios y tarifas**

6. ¿Cuál es el horario por día y en feriados?
7. ¿La frecuencia cambia en hora punta?
8. ¿Cuánto cuesta la tarifa general y hay tarifas diferenciadas?
9. ¿Desde cuándo rige la tarifa actual?
10. ¿Qué medios de pago aceptan?

**Paraderos y accesibilidad**

11. ¿Tienen una lista oficial de paraderos?
12. ¿Hay paraderos accesibles y cómo se identifican?
13. ¿Quién valida un cambio de paradero?

**Datos y sistemas**

14. ¿Tienen GPS o sistema de despacho?
15. ¿Pueden exportar recorridos o datos GTFS?
16. ¿Quién mantiene esa información?

**Contacto y actualización**

17. ¿Quién será nuestro contacto para cambios?
18. ¿Por qué canal prefieren recibir solicitudes de corrección?
19. ¿Con qué frecuencia cambian tarifas y horarios?

---

## Anexo G — Registro de contacto

| Fecha | Empresa | Contacto | Cargo | Canal | Resultado | Próximo paso | Responsable |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

**Estados sugeridos del registro:** `nuevo`, `contactado`, `reunión agendada`, `datos recibidos`, `en validación`, `publicado`, `descartado temporalmente`.

---

## Siguiente paso

Enviar el **Anexo A** a la primera empresa priorizada y registrar el contacto en el **Anexo G**. Si se necesita una plantilla de Excel o CSV lista para compartir, se puede generar a partir de las tablas de la sección 6.
