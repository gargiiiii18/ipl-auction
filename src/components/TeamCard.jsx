import React from 'react'
import {Fragment, useEffect, useState} from "react";
import {useNavigate, Link} from 'react-router-dom';
// import { loadConfigFromFile } from 'vite'
const TeamCard = ({currentPlayer}) => {

  const [allTeams, setAllTeams] = useState([]);

  const navigate = useNavigate();

  async function getTeams(){
    const url = " http://localhost:3000";
    try {
      const response = await fetch(url);
      const jsonData = await response.json();
      setAllTeams(jsonData);
      // console.log(jsonData);
  
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(()=>{
    getTeams()
  }, [])
  // console.log(allTeams);

  const displayTeamInfo = (team_id) =>{
    // console.log(team_id)>
    navigate(`teams/${team_id}`);
    // <Link to={`/team/${team_id}`} state={{ currentPlayer }}>
    //   {team}
    // </Link>
  }
  

  return (
    <div className='teamInfo'>
        <h2>Teams</h2>
      {
    allTeams.map((team, index)=>(
      // <Teams name={team.name} budget={team.budget}/>
      <div>
      <li className='teamList' key={team.team_id} onClick={() => displayTeamInfo(team.team_id)}>{team.team_name}</li>
      <span>{team.team_budget}</span> 
      </div>
    ))
   }
    </div>
  )
}

export default TeamCard
