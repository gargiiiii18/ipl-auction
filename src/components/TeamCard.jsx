import React from 'react'
import {Fragment, useEffect, useState} from "react";
import {useNavigate, Link} from 'react-router-dom';
const TeamCard = ({currentPlayer}) => {

  const [allTeams, setAllTeams] = useState([]);

  const navigate = useNavigate();

  async function getTeams(){
    const url = " http://localhost:3000";
    try {
      const response = await fetch(url);
      const jsonData = await response.json();
      setAllTeams(jsonData);
  
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(()=>{
    getTeams()
  }, [allTeams, currentPlayer])


  const displayTeamInfo = (team_id) =>{
    navigate(`teams/${team_id}`);
  }
  

  return (
    <div className='teamInfo'>
        <h1 className='teamName'>Teams</h1>
      <h4 className="listHeading">Team<span>Purse Remaining <br/>(cr.)</span></h4>
     
      {
        
    allTeams.map((team, index)=>(
      <div className='teams'>
      <li className='teamList' key={team.team_id} onClick={() => displayTeamInfo(team.team_id)}>{team.team_name}</li>
      <span>{team.team_budget}</span> 
      </div>
      
    ))
   }
    </div>
  )
}

export default TeamCard
