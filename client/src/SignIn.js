import React from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import history from './history';

export default function SignIn() {

    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");

    return (
        <div>
            <input placeholder="ID" onChange={(e) => setEmail(e.target.value)}></input>
            <input placeholder="Password" type="password" onChange={(e) => setPassword(e.target.value)}></input>
            <button onClick={() => axios.post('/login', { email, password }).then((res) => {
                if(res.status ===200 )
                    history.push('/')}).catch(err => console.log("err"))}>Sign in</button>
            <button onClick={() => {
                window.open('http://localhost:5000/auth/google', "_self");
            }}>login with google</button>
            <div>First time? Create your account <Link to="/signup">here</Link></div>
        </div>
    )

}