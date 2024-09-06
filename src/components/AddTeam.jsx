import React from 'react';
import { Fragment, useState } from "react";

const AddTeam = () => {

    const [teamInfo, setTeamInfo] = useState(
        {
            team_name: "",
            team_budget: ""
        }
    );
    
    function handleChange(event){
        const {name, value} = event.target;
        // setTeamInfo(
        //     {
        //         [name]: value
        //     }
        // )
        setTeamInfo(prevTeamInfo=>{
            return {
                ...prevTeamInfo,
                [name]: value
            }
    })
        console.log(teamInfo);
        
    }
    
    async function handleSubmit(event){
        event.preventDefault();
        const url = " http://localhost:3000/teams";
        try {
            const body = teamInfo;
            const response = await fetch(url, {
                method: "POST",
                headers: {"Content-Type" : "application/json"},
                body: JSON.stringify(body)
            });
            console.log(response.status);
            if(response.ok){
                window.location.href="http://localhost:5173/";
            }
            else{
                console.log("Failed to add team");
                
            }
        } catch (error) {
            console.log(error);
        }
    }

  return (
    <Fragment>
        {/* <h1>input todo</h1> */}
       <form className='addTeamForm' action="">
        <label htmlFor="team_name">Teame Name</label>
        <input type="text" name='team_name' onChange={handleChange} value={teamInfo.team_name}/>
        <label htmlFor="team_budget">Teame Budget</label>
        <input type="text" name='team_budget' onChange={handleChange} value={teamInfo.team_budget}/>
        <button className='submitTeam' onClick={handleSubmit}>Add</button>
       </form>
    </Fragment>
  )
}

export default AddTeam
