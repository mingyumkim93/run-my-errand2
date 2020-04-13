import React, { useEffect, useState } from 'react';
import history from './history';
import axios from 'axios';

export default function ErrandDetail(props) {

    const [ errand, setErrand ] = useState(undefined);

    function fetchErrand(){
        axios.get(`/api/errand/${props.match.params.id}`).then(res=>{
           if(res.data.length===0)
               {alert("Not Found!"); history.push("/search")}
            setErrand(res.data[0])}).catch(err=>alert("Something went wrong!", err));
    }
    
    useEffect(() => {
        fetchErrand();
        // ????????????????????????????????????????????????????
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);
    
    if (!errand)
    return( <div> loading...</div>)
    return (
        <div>
            <div>ErrandDetail</div>
            <div>{errand.id}</div>
            <div>{errand.title}</div>
            <div>{errand.description}</div>
        </div>
    )
}