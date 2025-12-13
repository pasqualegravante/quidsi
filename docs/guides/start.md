# START
In order to correctly start using the software follow the steps in the given order.

## General setup
In both **client** and **server** folders execute: 
`npm install`   - necessary to install the node dependencies

## Client
Commands must be executed in the **client** folder.  
The build is necessary for the server to serve client pages.

`npm run build` - creates the **dist** folder containing the static files, e.g. html, css, js

Only for testing purposes:  
`npm run dev`   - useful only for testing, hosts an istance of the frontend on localhost

## Server HTTP
Commands must be executed in the **server** folder.  
`npm start`     - starts an instance of the server on a localhost's port

## Server Python
Install python. Install pip. Then run the following:  
`pip install scipy networkx`