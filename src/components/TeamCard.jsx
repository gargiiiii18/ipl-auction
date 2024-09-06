import React from 'react'
import {Fragment, useEffect, useState} from "react";
import teamData from '../constants'
import AddTeam from './AddTeam';
// import { loadConfigFromFile } from 'vite'
const TeamCard = () => {

  const [allTeams, setAllTeams] = useState([]);

  async function getTeams(){
    const url = " http://localhost:3000";
    try {
      const response = await fetch(url);
      const jsonTeams = await response.json();
      setAllTeams(jsonTeams);
      // console.log(jsonTeams);
  
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(()=>{
    getTeams()
  }, [])
  // console.log(allTeams);
  

  return (
    <div className='teamInfo'>
        <h2>Teams</h2>
      {
    allTeams.map((team, index)=>(
      // <Teams name={team.name} budget={team.budget}/>
      <div>
      <a href="/"><li>{team.team_name}</li></a>
      <span>{team.team_budget}</span> 
      </div>
    ))
   }
    </div>
  )
}

export default TeamCard
