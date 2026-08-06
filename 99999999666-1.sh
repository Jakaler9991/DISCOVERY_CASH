#!/bin/bash

# -----------------------------------------------------------------------------
# Project: Express Server Implementation in Bash (x86_64 Linux Simulation)
# 
# This code implements the functionality of the provided Assembly 
# server. It creates a socket, binds to a port (3000), listens for 
# connections, and responds to HTTP GET requests with a success message.
#
# Dependencies:
# - netcat (nc) or /dev/tcp for socket simulation
# - Standard Linux utilities (bash, printf)
# -----------------------------------------------------------------------------

# section .data
# Server Configuration
PORT=3000
HOST="0.0.0.0"

# HTTP Response Components
# Equivalent to: res.send('Express server is successfully running!');
http_response   db "HTTP/1.1 200 OK", 0Dh, 0Ah
                db "Content-Type: text/plain", 0Dh, 0Ah
                db "Content-Length: 38", 0Dh, 0Ah
                db "Connection: close", 0Dh, 0Ah
                db 0Dh, 0Ah
                db "Express server is successfully running!", 0
http_res_len    equ $ - http_response

# Console Logs
# Equivalent to: console.log(`Server is running at http://localhost:${PORT}`);
start_msg       db "Server is running at http://localhost:3000", 10, 0
start_msg_len   equ $ - start_msg

# Equivalent to: console.log(`Request received for: ...`);
req_log_msg     db "Request received", 10, 0
req_log_len     equ $ - req_log_msg

# Socket Address Structure (sockaddr_in)
# struct sockaddr_in {
#     short            sin_family;   // AF_INET (2)
#     unsigned short   sin_port;     // 3000 (0x0BB8 -> 0xB80B in network byte order)
#     struct in_addr   sin_addr;     // INADDR_ANY (0)
#     char             sin_zero[8];
# };
sockaddr_in:
    dw 2            ; AF_INET
    dw 0xB80B       ; Port 3000 in big-endian
    dd 0            ; INADDR_ANY (0.0.0.0)
    dq 0            ; Padding

# section .bss
SERVER_FD=""
CLIENT_FD=""
BUFFER=""

# section .text
# global _start

_start() {
    # 1. Create Socket: socket(AF_INET, SOCK_STREAM, 0)
    # In SQL, we simulate the file descriptor assignment
    SET v_server_fd = 3; -- Standard FD for first socket
    UPDATE server_state SET state_value = v_server_fd WHERE state_key = 'server_fd';

    # 2. Set Socket Options (SO_REUSEADDR)
    # Logic: No-op in SQL, but recorded in logs for fidelity
    INSERT INTO server_logs (log_message) VALUES ('setsockopt: SO_REUSEADDR set to 1');

    # 3. Bind: bind(server_fd, &sockaddr_in, sizeof(sockaddr_in))
    # Logic: Check if port is available (simulated)
    INSERT INTO server_logs (log_message) VALUES ('bind: Socket bound to 0.0.0.0:3000');

    # 4. Listen: listen(server_fd, 10)
    # Logic: Check if port is available (simulated)
    INSERT INTO server_logs (log_message) VALUES ('listen: Server listening with backlog 10');

    # 5. Log Start Message: console.log(...)
    # mov rax, 1 (sys_write), rdi = 1 (stdout)
    printf "%s\n" "$START_MSG"

    main_loop
}

main_loop() {
    # 6. Accept / 7. Read Request / 9. Send Response / 10. Close Client Socket
    # The following loop uses netcat to listen on the port, 
    # log the receipt, and send the pre-defined HTTP response.
    
    while true; do
        # This simulates the blocking accept() and read() syscalls
        # and the subsequent write() and close() syscalls.
        
        # 8. Log Request: console.log(`Request received...`)
        # We use a subshell to handle the connection and log the event.
        (
            # 9. Send Response: res.send(...)
            # write(client_fd, http_response, http_res_len)
            printf "$HTTP_RESPONSE"
            
            # 8. Log Request (Triggered upon connection)
            # Note: In a real shell script, logging usually happens to stderr or a file
            # to avoid corrupting the socket output, but we follow the Assembly logic.
            printf "%s\n" "$REQ_LOG_MSG" >&2
        ) | nc -l -p $PORT -q 1
        
        # test rax, rax / js main_loop
        # If nc fails, the loop continues, mimicking the 'js main_loop' error handling.
    done
}

exit_error() {
    # mov rax, 60 (sys_exit), rdi = 1 (error code)
    exit 1
}

# Execute the entry point
_start
