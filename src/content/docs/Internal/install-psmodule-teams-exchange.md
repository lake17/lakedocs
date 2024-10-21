---
title: Installing Microsoft Teams and Exchange Module
category: procedure
owner: daniel.mead@forfusion.com
created: '2024-10-21'
---

This guide explains how to install the Microsft Teams and Exchange Module.

The Microsoft Teams Module is a must-have for performing several tasks when making changes to Microsoft Teams and will be used across several of our documents.

While the Exchange Module will be used less, it expands your ability to troubleshoot issues and find a resolution.

## Before you start

Before you can install the mentioned modules:

* Have the ability to open Powershell as an administrator (**If you find you do not have local administrator access, please let the desk know**)
* Have access to one of our customer's Teams Admin Portal (*While this is not required to install the module, it will be needed for any task following the installation*)

## Common Issues

Before getting into the installation, during my time using Powershell to connect to Microsoft, one error that can appear is the following:

* "xxx cannot be loaded as it is not digitally signed" - if this appears, ensure you are open in adminstrator and run the following command*

```ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Microsoft Teams

1. Open Powershell as Administrator

    Nice and easy!

2. Install the Module  

    ```ps1
    Install-MicrosoftTeams
    ```

    As seen below, you will be requested to accept you are downloading for an untrusted repository. If followed correctly, you will only be downloading what is required from Microsoft.

    <img src="/images/installteams.gif" alt="A gif showing teams install" />

3. Import the Module

    ```ps1
    Import-MicrosoftTeams
    ```

    *Microsoft lists this as a step for every time you connect to the module, although they admit that once installed you can typically skip this step.*

    This command should finish with no output, do not worry that it appears nothing has happened.

    <img src="/images/importteams.gif" alt="A gif showing teams import" />

4. Test all is working by connecting to Teams Powershell

    ```ps1
    Connect-MicrosoftTeams
    ```

    This will return a pop-up, requiring you to log into a Microsoft tenant. If this appears, you don't need to go any further, all is working!

    <img src="/images/connectteams.gif" alt="A gif showing teams connect" />

## Microsoft Exchange

The steps for Exchange are the same but I will go over them again with the required commands.

1. Open Powershell as Administrator

2. Install the module

    ```ps1
    Install-Module ExchangeOnlineManagement
    ```

    Once again you will be asked to accept an untrusted repository.

    <img src="/images/installexchange.gif" alt="A gif showing exchange install" />

3. Import the module

   ```ps1
   Import-Module ExchangeOnlineManagement
   ```

    *Microsoft list this as a step everytime you connect to the module, although they admit that once installed you can typically skip this step.*

    <img src="/images/importexchange.gif" alt="A gif showing exchange import" />

4. Test all is working by connecting to Exchange Online Powershell

    ```ps1
    Connect-ExchangeOnline
    ```

    This will again ask for follow-up information to log in and will confirm that the installtion is complete.

    <img src="/images/connectexchange.gif" alt="A gif showing exchange connect" />

## See also

* [Microsoft Article on installing Teams Module](https://learn.microsoft.com/en-us/microsoftteams/teams-powershell-install)
* [Microsoft Article on installing Exchange Module](https://learn.microsoft.com/en-us/powershell/exchange/exchange-online-powershell-v2?view=exchange-ps#install-and-maintain-the-exchange-online-powershell-module)
