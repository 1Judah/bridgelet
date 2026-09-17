# Bridgelet - Error Flows Diagram

```mermaid
flowchart TD
    START([Error Occurs]) --> ERROR_TYPE{Error Category}
    
    %% Token/Claim Errors
    ERROR_TYPE -->|Token/Claim| TOKEN_ERRORS[Token & Claim Errors]
    
    subgraph TOKEN_ERROR_SECTION [Token & Claim Errors]
        TOKEN_ERRORS --> INVALID_TOKEN[Invalid Token Format]
        TOKEN_ERRORS --> EXPIRED_TOKEN[Token Expired]
        TOKEN_ERRORS --> ALREADY_CLAIMED[Already Claimed]
        TOKEN_ERRORS --> ACCOUNT_NOT_FOUND[Account Not Found]
        
        INVALID_TOKEN --> DISPLAY_INVALID[Display:<br/>This claim link is invalid<br/>Possible reasons:<br/>- Link malformed<br/>- Link corrupted]
        EXPIRED_TOKEN --> DISPLAY_EXPIRED[Display:<br/>This claim link has expired<br/>Contact sender for new link]
        ALREADY_CLAIMED --> DISPLAY_CLAIMED[Display:<br/>This payment was already claimed<br/>on [Date]<br/>View transaction on explorer]
        ACCOUNT_NOT_FOUND --> DISPLAY_NOT_FOUND[Display:<br/>Claim not found<br/>Link may be invalid]
        
        DISPLAY_INVALID --> ACTION_INVALID{User Action}
        DISPLAY_EXPIRED --> ACTION_EXPIRED{User Action}
        DISPLAY_CLAIMED --> ACTION_CLAIMED{User Action}
        DISPLAY_NOT_FOUND --> ACTION_NOT_FOUND{User Action}
        
        ACTION_INVALID -->|Contact Sender| CONTACT_SENDER_1[Contact Sender]
        ACTION_INVALID -->|Go Home| GO_HOME_1[Go to Homepage]
        ACTION_EXPIRED -->|Contact Sender| CONTACT_SENDER_1
        ACTION_EXPIRED -->|Go Home| GO_HOME_1
        ACTION_CLAIMED -->|View Tx| VIEW_TX_1[View Transaction]
        ACTION_CLAIMED -->|Go Home| GO_HOME_1
        ACTION_NOT_FOUND -->|Contact Sender| CONTACT_SENDER_1
        ACTION_NOT_FOUND -->|Go Home| GO_HOME_1
    end
    
    %% Wallet Errors
    ERROR_TYPE -->|Wallet| WALLET_ERRORS[Wallet Connection Errors]
    
    subgraph WALLET_ERROR_SECTION [Wallet Errors]
        WALLET_ERRORS --> NOT_INSTALLED[Wallet Not Installed]
        WALLET_ERRORS --> USER_REJECTED[User Rejected Connection]
        WALLET_ERRORS --> NETWORK_MISMATCH[Network Mismatch]
        WALLET_ERRORS --> TX_REJECTED[Transaction Rejected]
        WALLET_ERRORS --> TIMEOUT[Connection Timeout]
        
        NOT_INSTALLED --> DISPLAY_NOT_INSTALLED[Display:<br/>Wallet not installed<br/>Please install Freighter<br/>or use mobile wallet]
        USER_REJECTED --> DISPLAY_REJECTED[Display:<br/>Connection cancelled<br/>Please try again]
        NETWORK_MISMATCH --> DISPLAY_MISMATCH[Display:<br/>Wallet on wrong network<br/>Please switch to Testnet]
        TX_REJECTED --> DISPLAY_TX_REJECTED[Display:<br/>Transaction declined in wallet<br/>You can retry]
        TIMEOUT --> DISPLAY_TIMEOUT[Display:<br/>Connection timed out<br/>Please try again]
        
        DISPLAY_NOT_INSTALLED --> ACTION_WALLET{User Action}
        DISPLAY_REJECTED --> ACTION_WALLET
        DISPLAY_MISMATCH --> ACTION_WALLET
        DISPLAY_TX_REJECTED --> ACTION_WALLET
        DISPLAY_TIMEOUT --> ACTION_WALLET
        
        ACTION_WALLET -->|Install Wallet| INSTALL_WALLET[Redirect to Install]
        ACTION_WALLET -->|Retry| RETRY_WALLET[Retry Connection]
        ACTION_WALLET -->|Try Different| TRY_DIFF[Try Different Wallet]
        ACTION_WALLET -->|Cancel| CANCEL_WALLET[Cancel]
        
        INSTALL_WALLET --> WALLET_RETRY{Retry?}
        RETRY_WALLET --> WALLET_RETRY
        TRY_DIFF --> WALLET_RETRY
        WALLET_RETRY -->|Yes| WALLET_ERRORS
        WALLET_RETRY -->|No| END_WALLET([End - Cancelled])
        CANCEL_WALLET --> END_WALLET
    end
    
    %% Validation Errors
    ERROR_TYPE -->|Validation| VALIDATION_ERRORS[Input Validation Errors]
    
    subgraph VALIDATION_ERROR_SECTION [Validation Errors]
        VALIDATION_ERRORS --> INVALID_ADDRESS[Invalid Wallet Address]
        VALIDATION_ERRORS --> INVALID_AMOUNT[Invalid Amount]
        VALIDATION_ERRORS --> INVALID_ASSET[Invalid Asset]
        VALIDATION_ERRORS --> INVALID_EXPIRY[Invalid Expiration]
        
        INVALID_ADDRESS --> DISPLAY_ADDR_ERROR[Display:<br/>Invalid Stellar address<br/>Requirements:<br/>- Must start with G<br/>- Must be 56 characters<br/>Example: GD5J6H...]
        INVALID_AMOUNT --> DISPLAY_AMOUNT_ERROR[Display:<br/>Please enter valid amount<br/>- Must be positive<br/>- Max 2 decimal places]
        INVALID_ASSET --> DISPLAY_ASSET_ERROR[Display:<br/>Selected asset is invalid<br/>Please select from list]
        INVALID_EXPIRY --> DISPLAY_EXPIRY_ERROR[Display:<br/>Expiry must be between<br/>1 hour and 90 days]
        
        DISPLAY_ADDR_ERROR --> FIX_INPUT[Fix Input]
        DISPLAY_AMOUNT_ERROR --> FIX_INPUT
        DISPLAY_ASSET_ERROR --> FIX_INPUT
        DISPLAY_EXPIRY_ERROR --> FIX_INPUT
        
        FIX_INPUT --> REVALIDATE{Re-validate?}
        REVALIDATE -->|Yes| VALIDATION_ERRORS
        REVALIDATE -->|No| END_VALIDATION([End - Cancelled])
    end
    
    %% System Errors
    ERROR_TYPE -->|System| SYSTEM_ERRORS[System & Network Errors]
    
    subgraph SYSTEM_ERROR_SECTION [System Errors]
        SYSTEM_ERRORS --> SWEEP_FAILED[Sweep Execution Failed]
        SYSTEM_ERRORS --> NETWORK_UNAVAILABLE[Stellar Network Unavailable]
        SYSTEM_ERRORS --> RATE_LIMITED[Rate Limit Exceeded]
        SYSTEM_ERRORS --> SERVER_ERROR[Server Error 500]
        SYSTEM_ERRORS --> INSUFFICIENT_BALANCE[Insufficient Balance]
        
        SWEEP_FAILED --> DISPLAY_SWEEP_FAIL[Display:<br/>Claim failed<br/>Your funds are safe<br/>Please try again]
        NETWORK_UNAVAILABLE --> DISPLAY_NETWORK[Display:<br/>Network temporarily unavailable<br/>We're having trouble connecting<br/>to Stellar network]
        RATE_LIMITED --> DISPLAY_RATE_LIMIT[Display:<br/>Too many attempts<br/>Please wait [countdown]<br/>before retrying]
        SERVER_ERROR --> DISPLAY_SERVER[Display:<br/>Something went wrong on our end<br/>Please try again or contact support]
        INSUFFICIENT_BALANCE --> DISPLAY_BALANCE[Display:<br/>Insufficient balance<br/>to create payment<br/>Check wallet balance]
        
        DISPLAY_SWEEP_FAIL --> ACTION_SYSTEM{User Action}
        DISPLAY_NETWORK --> ACTION_SYSTEM
        DISPLAY_RATE_LIMIT --> ACTION_SYSTEM
        DISPLAY_SERVER --> ACTION_SYSTEM
        DISPLAY_BALANCE --> ACTION_SYSTEM
        
        ACTION_SYSTEM -->|Retry| RETRY_SYSTEM[Retry with Backoff]
        ACTION_SYSTEM -->|Check Status| CHECK_TX_STATUS[Check Transaction Status]
        ACTION_SYSTEM -->|Contact Support| CONTACT_SUPPORT[Contact Support]
        ACTION_SYSTEM -->|Cancel| CANCEL_SYSTEM[Cancel]
        
        RETRY_SYSTEM --> RETRY_COUNT{Retry Count}
        RETRY_COUNT -->|< 3| SYSTEM_ERRORS
        RETRY_COUNT -->|>= 3| MAX_RETRIES[Max Retries Reached]
        MAX_RETRIES --> CONTACT_SUPPORT
        
        CHECK_TX_STATUS --> TX_STATUS{Transaction Status?}
        TX_STATUS -->|Success| SHOW_SUCCESS[Show Success]
        TX_STATUS -->|Failed| SYSTEM_ERRORS
        TX_STATUS -->|Pending| WAIT_PENDING[Wait & Retry]
        WAIT_PENDING --> RETRY_SYSTEM
        
        CONTACT_SUPPORT --> END_SUPPORT([End - Support])
        CANCEL_SYSTEM --> END_SYSTEM([End - Cancelled])
        SHOW_SUCCESS --> END_SUCCESS([End - Success])
    end
    
    %% Recovery Strategies
    subgraph RECOVERY [Recovery Strategies]
        direction LR
        R1[Exponential Backoff<br/>2s, 4s, 8s...]
        R2[Status Polling<br/>Check current state]
        R3[Graceful Degradation<br/>Show cached data]
        R4[Clear Error Messages<br/>No technical jargon]
        R5[Support Contact<br/>Request ID provided]
    end
    
    %% Error Handling Best Practices
    subgraph BEST_PRACTICES [Error Handling Best Practices]
        direction LR
        BP1[Explain what happened]
        BP2[Suggest next steps]
        BP3[Provide support contact]
        BP4[No raw error codes]
        BP5[Don't blame user]
    end
    
    %% Connect recovery to errors
    RETRY_SYSTEM -.->|Uses| R1
    CHECK_TX_STATUS -.->|Uses| R2
    CONTACT_SUPPORT -.->|Provides| R5
    
    %% Final End States
    GO_HOME_1 --> END_TOKEN([End])
    VIEW_TX_1 --> END_TOKEN
    END_WALLET --> END_ALL
    END_VALIDATION --> END_ALL
    END_SUPPORT --> END_ALL
    END_SYSTEM --> END_ALL
    END_TOKEN --> END_ALL([END])
    END_SUCCESS --> END_ALL
```
