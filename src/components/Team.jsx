import React, {useState, useEffect} from 'react';
import { useParams } from 'react-router-dom';

const Team = (props) => {

  const [players, setPlayers] = useState([]);
  // const [isOpen, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState(null);

  const {team_id} = useParams();

  const toggleDropdown = (playerId) => {
    setPlayerId((prev)=>playerId===prev?null:playerId)
    // playerId===null&&setOpen(true)
  }

  async function getPlayers(){
    const url = `http://localhost:3000/teams/${team_id}`;
    try {
      const response = await fetch(url);
      const jsonPlayers = await response.json();
      setPlayers(jsonPlayers);
      console.log(jsonPlayers);
    } catch (error) {
      console.log(error);
      
    }
  }

  useEffect(()=>{
    getPlayers()
  }, [team_id]);

  return (
    <div className="playerContainer">
    <div className='players'>
      <h2 className='playersHeading'>Players</h2>
      <h2>Team Details for ID: {team_id}</h2>
      <ul>
      {players.length > 0 ? (
        players.map((player) => (
          <li id={player.player_id} key={player.player_id} className='teamList' onClick={()=>{
            toggleDropdown(player.player_id)
          }}>
            {player.player_name}
            {
        playerId===player.player_id&&(
          <div className="dropDown dropDown-open">
            <p>Skills: {player.skills}</p>
            <p>Price: {player.price}</p>
          </div>
        )
      }
          </li>
        ))
      ) : (
        <li className='teamList'>No players found.</li>
      )}
      </ul>
      
    </div>
    </div>
  )
}

export default Team
