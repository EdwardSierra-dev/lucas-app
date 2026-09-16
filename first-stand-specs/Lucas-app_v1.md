# Lucas-app\_v1

## 1. Login.

Inicialmente se puede realizar el registro de usuarios ingresando el correo:

#### 1.1 Input correo.

* El input del correo debe validar de primera medida si es un correo válido, se puede usar regex.

#### 1.2 Input password.

* El input de password debe tener los criterios de seguridad recomendados ( 8 caracteres mínimo, incluir por lo menos 1 mayúscula, 1 numero y 1 carácter especial).
* Debe tener otro input para confirmar la contraseña.

#### 1.3 Botón de registrar.

* Una vez terminado el registro, se debe mostrar un modal informando que se realizo el registro exitosamente, y debe llegar al correo del usuario el mensaje de registro exitoso.

## 2. Personalizable.

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

## 3. Gastos vehiculares

Se decide tener en cuenta está función por el hecho de que mantener un vehículo es algo complejo. Inicialmente, cuando el usuario indique que tiene vehículo y luego de terminar de escoger los gastos obligatorios y no obligatorios el sistema deme mostrar lo siguiente:

* Una vez terminada la configuración inicial de los gastos, el sistema debe mostrar un mensaje indicando lo siguiente en un modal: (Tipo de vehículo, Fecha, Modelo, Fecha SOAT, Fecha Tecno, Fecha kit de carretera opcional).
* El titulo del modal debe ser: Páseme los datos del maquinón.
* La fecha no debe ser futura a la del día que se está realizando el registro.

## 4. Presupuesto compartido

* La app debe permitir registrar los ingresos de los usuarios.
* El usuario puede invitar al otro usuario con el correo electrónico registrado.
* La app debe mostrar una notificación cuando has sido invitado a un presupuesto compartido.
* En el prosupuesto compartido los dos usuarios pueden agregar o quitar gastos, ingresos adicionales o registros de lo que han gastado.
* La app debe permitir que los usuarios determinen su presupuesto del mes.

## 5. Metricas

* La app debe poder permitir filtrar los gatos por mes.
* La app debe permitir filtrar los gatos por tipo de gasto EJ: cuanto en gas, cuando en agua.
* la app debe poder filtrar por fecha.
* La app debe poder permitir filtrar los gatos de la otra persona de presupuesto compartido o familiar.
* Una vez selecciona un filtro de 5 meses con un tipo de gasto, el sistema debe realizar las sumas inminediatamente y mostrar el total del gasto durante ese tiempo.

## 6. Funcionalidad de prestamos a terceros

Esta parte tiene como objetivo mostrar los gatos que se tienen con los prestamos a prestamistas ya que tienen un interes elevado. La idea es registrar mes a mes cuando es el prestamos + el interes.

* La app al momento de agregar un gasto, si la persona ingresa prestamo debe preguntar: banco o persona
* Si es banco solo dejará ingresar el valor de la cuota sin más detalle.
* Si es persona, la app debe preguntar cuanto de capita y cuanto de interes y cuantas cuaotas de plazo tiene para pagar el crédito.