# Lucas-app\_v1

1. ## Login.

Inicialmente se puede realizar el registro de usuarios ingresando el correo:

#### 1.1 Input correo.

* El input del correo debe validar de primera medida si es un correo válido, se puede usar regex.

#### 1.2 Input password.

* El input de password debe tener los criterios de seguridad recomendados ( 8 caracteres mínimo, incluir por lo menos 1 mayúscula, 1 numero y 1 carácter especial).
* Debe tener otro input para confirmar la contraseña.

#### 1.3 Botón de registrar.

* Una vez terminado el registro, se debe mostrar un modal informando que se realizo el registro exitosamente, y debe llegar al correo del usuario el mensaje de registro exitoso.

## 

2. ## Personalizable.

El usuario podrá seleccionar las siguientes opciones:

#### 2.1 Gastos mensuales fijos obligatorios.

* Antes de seleccionar estos gastos el sistema debe mostrar un modal skipeable donde dirá la siguiente leyenda: \*Estos gastos mensuales son aquellos que no puedes dejar de pagar o sino pailas papi 💪🏻\* luego del mensaje, debe aparecer para escoger múltiples opciones las cuales inicialmente serán: (Agua, Luz, Gas, Arriendo, Comida, Internet, Colegio, Transporte).
* En la lista se pueden agregar gastos propios de las personas.
* Este último item debe agregarse con un botón + y debe aparecer para agregar el nombre del gasto y colocarle un emoji seleccionable.
* El usuario escoge el nombre, el emoji y debe darle aceptar para que ya aparezca en la lista.
* Todos los gastos pueden ser removibles por si el usuario decide no tener alguno de esos gastos.
* El sistema debe preguntar si la persona tiene vehículo o no, ya que si tiene vehículo se debe habilitar la función de control de gastos vehiculares.
* El sistema debe permitir agregar las fechas de pago y enviar notificaciones para cuando sean las fechas de pago.

#### 2.2 Gastos mensuales fijos NO obligatorios.

* Antes de seleccionar estos gastos el sistema debe mostrar un modal skipeable donde dirá la siguiente leyenda: \*Estos gastos son aquellos que quieres pero no los necesitas 😎 alguien tenía que decírtelo\* luego del mensaje, debe aparecer para escoger múltiples opciones las cuales inicialmente serán: (Netflix, Spotify, Amazon Prime).
* Estos gastos deben tener la misma lógica de adición y eliminación que los otros gatos.
* También se debe agregar la fecha para recordar los pagos.

3. ## Gastos vehiculares

Se decide tener en cuenta está función por el hecho de que mantener un vehículo es algo complejo. Inicialmente, cuando el usuario indique que tiene vehículo y luego de terminar de escoger los gastos obligatorios y no obligatorios el sistema deme mostrar lo siguiente:

* Una vez terminada la configuración inicial de los gastos, el sistema debe mostrar un mensaje indicando lo siguiente en un modal: (Tipo de vehículo, Fecha, Modelo, Fecha SOAT, Fecha Tecno, Fecha kit de carretera opcional).
* El titulo del modal debe ser: Páseme los datos del maquinón.
* La fecha no debe ser futura a la del día que se está realizando el registro.
