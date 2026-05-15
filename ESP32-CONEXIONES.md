## Conexiones básicas ESP32 + LED para LightLess

Esta guía está pensada para arrancar **hoy** con lo que tenés:

- ESP32 de 30 pines
- LED (foquito)
- Protoboard
- Cable USB-C
- Mac
- Jumpers
- Resistencia
- VS Code + PlatformIO

La idea es hacer una primera versión **simple, segura y mejorable** para después escalar cuando te lleguen más componentes.

---

## Objetivo de esta primera versión

Vamos a conectar un LED a un pin GPIO del ESP32 para poder:

1. Encenderlo y apagarlo desde el microcontrolador.
2. Integrarlo después con la lógica de LightLess.
3. Tener una base limpia para mejorar luego con relé, fuente externa, sensores o más luces.

---

## IMPORTANTE antes de cablear

El ESP32 trabaja en **3.3V lógicos**, NO en 5V en los GPIO.

Eso significa:

- Nunca metas 5V directo a un GPIO.
- El LED **DEBE** llevar resistencia en serie.
- Para una prueba inicial, no hace falta una fuente externa: el ESP32 por USB alcanza.

---

## Resistencia disponible y recomendada para TU caso

Ahora mismo me dijiste que tenés una resistencia de **680Ω**. Eso **sí sirve** para esta prueba.

No es el valor que da más brillo, pero para arrancar está perfecto porque:

- limita mejor la corriente,
- protege el LED,
- protege el GPIO del ESP32,
- y sigue siendo totalmente válida para una prueba funcional.

### Entonces, para tu montaje actual

- **680Ω** → usable y recomendada con lo que tenés hoy
- **220Ω** → más brillo, si conseguís una después
- **330Ω** → también muy buena opción futura
- **1kΩ** → también sirve, pero con menos brillo

### Códigos de colores comunes

#### Resistencia de 220Ω
- Rojo
- Rojo
- Marrón
- Dorado

#### Resistencia de 330Ω
- Naranja
- Naranja
- Marrón
- Dorado

#### Resistencia de 1kΩ
- Marrón
- Negro
- Rojo
- Dorado

#### Resistencia de 680Ω
- Azul
- Gris
- Marrón
- Dorado

Con lo que tenés hoy, arrancá con **680Ω** sin problema. Va a funcionar para validar el circuito aunque el LED pueda verse un poco menos brillante que con 220Ω o 330Ω.

---

## Conexión recomendada

Para esta primera implementación te recomiendo usar **GPIO 2**.

¿Por qué?

- Es muy común para pruebas con LED en ESP32.
- Suele ser fácil de usar para un primer test.
- Más adelante lo podés cambiar por otro GPIO si el firmware lo necesita.

---

## Cómo identificar las patas del LED

Un LED normal tiene:

- **Pata larga** = ánodo = positivo
- **Pata corta** = cátodo = negativo

Además, el lado plano del encapsulado normalmente indica el **cátodo**.

---

## Qué es una protoboard y cómo funciona

Si nunca usaste una protoboard, arrancá por esta idea:

Una **protoboard** es una placa con agujeritos que ya están conectados por dentro en ciertos grupos. Sirve para armar circuitos **sin soldar**.

Pero OJO: no todos los agujeros están unidos entre sí.

### Regla mental simple

La protoboard tiene dos zonas típicas:

1. **Rieles laterales** de alimentación
2. **Zona central** para componentes

### 1. Rieles laterales

En muchas protoboards, los costados tienen líneas largas marcadas con `+` y `-`.

Esas líneas suelen estar conectadas a lo largo y se usan para alimentación, por ejemplo:

- `+` para 3.3V o 5V
- `-` para GND

PERO no des nada por sentado: algunas protoboards vienen cortadas en el medio y no todo el riel está unido de punta a punta.

### 2. Zona central

En la parte del medio están los agujeros donde vas a poner LED, resistencias y jumpers.

Normalmente funciona así:

- cada fila de **5 agujeros** de un lado está conectada internamente,
- y cada fila de **5 agujeros** del otro lado también,
- pero **los dos lados NO están conectados entre sí** porque en el medio hay una ranura.

Visualmente se entiende así:

```text
A B C D E   ||   F G H I J
```

Si tu protoboard es la típica, entonces:

- `A1 B1 C1 D1 E1` están conectados entre sí
- `F1 G1 H1 I1 J1` están conectados entre sí
- pero el bloque izquierdo y el derecho del mismo número **NO** están conectados entre sí

La ranura del medio está justamente para poner componentes como integrados, o para separar conexiones.

---

## Regla de oro para no equivocarte en protoboard

Si dos patas o cables están en la **misma línea conectada internamente**, entonces eléctricamente es como si estuvieran unidos.

Si están en líneas distintas, entonces **NO** están unidos, salvo que los unas con un cable o un componente.

---

## Antes de empezar: cómo orientar la protoboard

Ponela sobre la mesa de forma que:

- la ranura central quede en vertical o a la vista claramente,
- puedas distinguir lado izquierdo y lado derecho,
- tengas cómodo el acceso al ESP32 y los jumpers.

No importa tanto la orientación exacta. Lo importante es que entiendas **qué agujeros comparten conexión interna**.

---

## Cómo colocar el LED correctamente en la protoboard

Este punto es CLAVE.

El LED tiene dos patas. Si las ponés en agujeros de la **misma línea conectada**, hacés cualquiera porque las dos patas quedan unidas y el circuito no funciona como esperás.

### Cómo ponerlo bien

Poné el LED de forma que:

- una pata quede en una fila,
- la otra pata quede en otra fila distinta,
- idealmente cruzando la separación central o al menos evitando que ambas patas caigan en la misma línea conectada.

### Forma segura para principiante

La forma más segura es poner el LED con una pata de un lado de la ranura central y la otra del otro lado.

Ejemplo conceptual:

```text
E10   ||   F10
```

Si una pata entra en `E10` y la otra en `F10`, quedan separadas por la ranura central y no comparten la misma conexión interna.

Eso te evita uno de los errores más comunes.

---

## Cómo colocar la resistencia correctamente

La resistencia no tiene polaridad, así que da igual qué extremo pongas primero.

Pero SÍ importa en qué agujeros la ponés.

Tenés que lograr que:

- un extremo de la resistencia comparta conexión con la **pata larga del LED**,
- el otro extremo quede en una línea distinta para poder llevarlo al **GPIO 2**.

---

## Conexión recomendada con protoboard paso a paso

Vamos a usar un ejemplo físico simple. No importa si no coincide exacto con la impresión de tu protoboard; lo importante es la lógica.

### Paso 1 — colocá el LED

Insertá el LED cruzando la ranura central.

Por ejemplo:

- **pata larga** del LED en `E10`
- **pata corta** del LED en `F10`

Eso deja cada pata en un bloque distinto.

### Ubicaciones EXACTAS recomendadas

Para que no tengas que adivinar, usá estas posiciones exactas en la protoboard:

- **LED pata larga** → `E20`
- **LED pata corta** → `F20`
- **Resistencia punta 1** → `A20`
- **Resistencia punta 2** → `A25`
- **Jumper desde GPIO 2** → `C25`
- **Jumper desde GND** → `J20`

Estas coordenadas están elegidas para que el circuito quede ordenado y fácil de revisar.

---

## Conexiones exactas que vas a hacer

Seguí esto EXACTAMENTE:

### 1. Colocá el LED

Insertá el LED así:

- pata larga del LED en **E20**
- pata corta del LED en **F20**

NO cambies esas posiciones por ahora.

### 2. Colocá la resistencia de 680Ω

Insertá la resistencia así:

- una punta en **A20**
- la otra punta en **A25**

### 3. Colocá el jumper que viene desde GPIO 2 del ESP32

Poné un jumper así:

- un extremo en el pin **GPIO 2** del ESP32
- el otro extremo en **C25** de la protoboard

### 4. Colocá el jumper que viene desde GND del ESP32

Poné otro jumper así:

- un extremo en un pin **GND** del ESP32
- el otro extremo en **J20** de la protoboard

---

## Cómo queda conectado internamente con esas posiciones

Con esas posiciones exactas pasa esto:

- `A20` está conectado internamente con `B20`, `C20`, `D20`, `E20`
- como la resistencia está en `A20`, queda unida con `E20`
- como la pata larga del LED está en `E20`, la resistencia queda unida al LED

Después:

- la otra punta de la resistencia está en `A25`
- `A25` está conectado con `B25`, `C25`, `D25`, `E25`
- como pusiste el jumper en `C25`, ese jumper queda unido a la resistencia

Y del otro lado:

- `F20` está conectado con `G20`, `H20`, `I20`, `J20`
- como la pata corta del LED está en `F20`
- y pusiste el jumper de GND en `J20`
- entonces GND queda unido a la pata corta del LED

O sea, el circuito final queda bien armado.

---

## Resumen de ubicaciones exactas

Copiá esto tal cual:

```text
LED pata larga  -> E20
LED pata corta  -> F20
Resistencia     -> A20 a A25
Jumper GPIO 2   -> C25
Jumper GND      -> J20
```

---

## Orden exacto para montarlo sin confundirte

Hacelo en este orden:

1. Poné el LED en `E20` y `F20`
2. Poné la resistencia entre `A20` y `A25`
3. Poné un jumper desde `GPIO 2` hasta `C25`
4. Poné un jumper desde `GND` hasta `J20`
5. Recién ahí conectá el ESP32 por USB-C a la Mac

---

## Qué deberías ver físicamente

Cuando termines, deberías tener esto:

- un LED cruzando la ranura central en la fila `20`
- una resistencia vertical del lado izquierdo entre `20` y `25`
- un jumper llegando a `C25`
- un jumper llegando a `J20`

---

## Mini mapa visual

```text
Izquierda                      Derecha

A20 --- resistencia --- A25
E20 --- pata larga LED
           ||
F20 --- pata corta LED
C25 --- jumper a GPIO 2
J20 --- jumper a GND
```

Más explícito todavía:

```text
Fila 20:
A20  [resistencia]
B20
C20
D20
E20  [LED pata larga]
 ||
F20  [LED pata corta]
G20
H20
I20
J20  [jumper a GND]

Fila 25:
A25  [resistencia]
B25
C25  [jumper a GPIO 2]
D25
E25
```

---

## Si tu protoboard tiene numeración distinta

Si no ves exactamente hasta la fila 25, o si tu protoboard arranca en otra zona visual, no pasa nada. Lo importante es que respetes esta lógica:

- LED cruzando la ranura central en una misma fila
- resistencia desde el bloque izquierdo del LED hacia otra fila izquierda
- jumper de GPIO 2 a esa segunda fila
- jumper de GND al bloque derecho del LED

Pero si tu protoboard es la típica de 64 filas o similar, las posiciones que te di (`E20`, `F20`, `A20`, `A25`, `C25`, `J20`) te sirven perfecto.

### Paso 2 — conectá la resistencia a la pata larga

Poné una punta de la resistencia en cualquier agujero que comparta línea con `E10`.

Por ejemplo:

- una punta de la resistencia en `A10`

Como `A10-B10-C10-D10-E10` están conectados, eso une la resistencia con la pata larga del LED.

Ahora poné la otra punta de la resistencia en otra fila distinta, por ejemplo:

- la otra punta de la resistencia en `A15`

Ahora la resistencia conecta:

- la fila 10 (lado izquierdo)
- con la fila 15 (lado izquierdo)

### Paso 3 — jumper desde GPIO 2 hacia la resistencia

Conectá un jumper desde el pin **GPIO 2** del ESP32 hacia cualquier agujero que comparta conexión con la punta libre de la resistencia.

Siguiendo el ejemplo:

- jumper desde `GPIO 2` del ESP32 hacia `C15`

Como `A15-B15-C15-D15-E15` están conectados entre sí, `C15` queda unido a la punta de la resistencia que estaba en `A15`.

### Paso 4 — jumper desde GND hacia la pata corta del LED

Conectá otro jumper desde un pin **GND** del ESP32 hacia cualquier agujero que comparta línea con `F10`.

Por ejemplo:

- jumper desde `GND` del ESP32 hacia `J10`

Como `F10-G10-H10-I10-J10` están conectados entre sí, eso une GND con la pata corta del LED.

---

## Resultado eléctrico del ejemplo

Con ese ejemplo, el camino queda así:

```text
GPIO 2 -> jumper -> fila 15 izquierda -> resistencia -> fila 10 izquierda -> LED -> fila 10 derecha -> jumper -> GND
```

Y eso es exactamente lo que queríamos lograr.

---

## Ejemplo visual orientativo

```text
Lado izquierdo            Ranura            Lado derecho

A10 -- resistencia -- A15
E10 ---- pata larga LED || pata corta LED ---- F10
C15 ---- jumper a GPIO2
J10 ---- jumper a GND
```

No copies las letras y números como robot si tu protoboard cambia. Lo importante es entender QUÉ comparte fila con QUÉ.

---

## Cómo pensar la protoboard sin volverte loco

Pensalo como bloques de conexión:

- bloque 1: pata larga del LED + una punta de resistencia
- bloque 2: otra punta de resistencia + jumper a GPIO 2
- bloque 3: pata corta del LED + jumper a GND

Si lográs esos 3 bloques, el circuito está bien planteado.

---

## Errores típicos de principiante en protoboard

### Error 1: poner las dos patas del LED en la misma línea
Resultado: el LED queda mal conectado o en corto lógico.

### Error 2: poner ambas patas de la resistencia en la misma fila conectada
Resultado: la resistencia no hace nada.

### Error 3: creer que toda la fila horizontal completa está unida atravesando la ranura central
Resultado: conectás cosas que pensabas separadas.

### Error 4: conectar GND en una fila que no comparte línea con la pata corta del LED
Resultado: el circuito queda abierto y no prende.

### Error 5: usar un jumper en un agujero “cercano” pero no eléctricamente unido
Resultado: visualmente parece conectado, pero en realidad no lo está.

---

## Verificación manual antes de alimentar

Antes de enchufar el ESP32 a la Mac, revisá esto:

1. La **pata larga** del LED va hacia la resistencia.
2. La **pata corta** del LED va hacia GND.
3. La resistencia une dos filas distintas.
4. Un jumper conecta la fila libre de la resistencia con **GPIO 2**.
5. Otro jumper conecta la fila de la pata corta con **GND**.
6. No hay patas metidas en el mismo bloque por accidente.

---

## Esquema de conexión

Conectá así:

1. **GPIO 2 del ESP32** → **resistencia de 680Ω**
2. **resistencia** → **pata larga del LED (ánodo)**
3. **pata corta del LED (cátodo)** → **GND del ESP32**

---

## Diagrama simple

```text
ESP32 GPIO 2  ---- resistencia 680Ω ----|>|---- GND
                                              LED
```

---

## Paso a paso en protoboard

1. Conectá el ESP32 a la protoboard solo si entra cómodo y no tapa demasiado las filas; si no, podés dejarlo al costado y usar jumpers.
2. Insertá el LED **cruzando la ranura central** de la protoboard, con cada pata en un lado distinto.
3. Identificá la **pata larga** y la **pata corta** del LED.
4. Insertá una punta de la resistencia en la misma línea conectada que la **pata larga** del LED.
5. Insertá la otra punta de la resistencia en otra fila distinta y libre.
6. Conectá un jumper desde **GPIO 2** hasta la fila donde quedó libre la segunda punta de la resistencia.
7. Conectá un jumper desde **GND** hasta la fila donde está la **pata corta** del LED.
8. Recién después conectá el ESP32 a la Mac con el USB-C.

---

## Qué NO hacer

- No conectes el LED sin resistencia.
- No conectes el LED directo entre 3.3V y GND sin control.
- No uses 5V en el GPIO.
- No arranques con cargas reales de casa, focos de 110V/220V o tiras potentes directamente desde el ESP32.

### Y MUY importante con tu cable USB pelado

Mencionaste que tenés un **cable USB pelado que termina en 2 cables banana o jumpers macho**.

Ese cable puede servir, pero con MUCHÍSIMO cuidado.

#### Regla de oro

- **NO lo uses para meter corriente a un GPIO**
- **NO lo uses si no sabés con certeza cuál es positivo y cuál es negativo**
- **NO lo conectes al azar al ESP32**

Porque si invertís polaridad o tocás un pin incorrecto, podés dañar la placa.

#### Para qué sí podría servir

Solo como **alimentación**, y aun así únicamente si:

1. identificás correctamente el positivo y el negativo,
2. confirmás que realmente está entregando lo esperado,
3. lo conectás a los pines correctos de alimentación de la placa.

#### Recomendación concreta

Para esta primera etapa, lo más seguro es esto:

- **alimentá el ESP32 con su cable USB-C normal desde la Mac**
- **usá los jumpers solo para el LED y la protoboard**
- **dejá el cable USB pelado fuera del circuito por ahora**

Eso te evita un error de alimentación, que es una de las formas más tontas de matar una placa buena.

Eso sería una locura cósmica, hermano. El ESP32 no está para manejar cargas grandes directo. Para eso después se usa **relé**, **MOSFET** o un driver adecuado.

---

## Primera etapa recomendada del proyecto

Te conviene pensar esto en capas:

### Etapa 1 — prueba local
- Encender/apagar LED desde firmware.
- Verificar que GPIO, LED y resistencia estén bien conectados.

### Etapa 2 — integración con LightLess
- Conectar el ESP32 al Wi-Fi.
- Hacer que reciba comandos MQTT.
- Traducir esos comandos a `HIGH/LOW` en el pin.

### Etapa 3 — mejora futura
- Reemplazar LED de prueba por un módulo relé o MOSFET.
- Controlar una carga real.
- Agregar sensor de estado o telemetría real.

---

## GPIO alternativos si GPIO 2 da problemas

Si más adelante ves que `GPIO 2` te trae conflictos de arranque o de tu placa específica, probá con alguno de estos:

- `GPIO 4`
- `GPIO 5`
- `GPIO 18`
- `GPIO 19`
- `GPIO 21`
- `GPIO 22`
- `GPIO 23`

No todos los pines del ESP32 son iguales. Algunos influyen en el booteo. Para una prueba rápida, `GPIO 2` suele andar bien, PERO si se pone caprichoso lo cambiamos.

---

## Recomendación práctica para firmware

Definí el pin del LED como una constante configurable, por ejemplo:

```cpp
#define LED_PIN 2
```

O mejor todavía:

```cpp
const int LED_PIN = 2;
```

¿Y sabés por qué? Porque cuando cambies de prototipo o placa, no querés andar rompiendo lógica por todos lados. Cambiás un solo valor y listo.

---

## Conexión mínima final

### Resumen ultra corto

- `GPIO 2` → resistencia `680Ω`
- resistencia → pata larga del LED
- pata corta del LED → `GND`
- ESP32 → Mac por USB-C

### Con lo que tenés HOY

- Sí: **ESP32 + protoboard + LED + resistencia 680Ω + jumpers**
- Sí: **USB-C a la Mac para alimentar/programar**
- No por ahora: **cable USB pelado a banana/jumper** dentro del circuito del LED

---

## Mejora futura recomendada

Cuando te lleguen más cosas, el siguiente salto lógico sería:

1. **Módulo relé de 1 canal** o **MOSFET**
2. **Fuente externa** si la carga lo requiere
3. **Protoboard/fuente más robusta**
4. **Multímetro** para validar resistencias y continuidad
5. **Bornes o conectores confiables** para evitar inventos raros con cables pelados

El multímetro, te lo digo de una, es de esas herramientas que te ahorran HORAS de prueba y error.

---

## Nota para LightLess

Este montaje es ideal como **dispositivo prototipo** para LightLess:

- hoy simula una luz real con un LED,
- mañana lo reemplazás por una etapa de potencia,
- y la arquitectura del software puede mantenerse casi igual.

Ese es el enfoque correcto: **primero validar el sistema, después escalar el hardware**.
