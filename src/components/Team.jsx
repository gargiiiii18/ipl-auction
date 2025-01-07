import React, {useState, useEffect} from 'react';
import { useParams } from 'react-router-dom';
import AddBid from './AddBid';
const Team = (props) => {

  const [players, setPlayers] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const[teamName, setTeamName] = useState("");
  const[teamBudget, setTeamBudget] = useState(null);
  const [isClicked, setClicked] = useState(false);
  const[buttonText, setButtonText] = useState("Bid");

    //states controlling AddBid
    const [message, setMessage] = useState("");
    const [showBid, setShowBid] = useState(true);

  const {team_id} = useParams();

  const toggleDropdown = (playerId) => {
    setPlayerId((prev)=>playerId===prev?null:playerId)
  }

  const checkIfCanBid = async (playerId) => {
    const url = `http://localhost:3000/teams/${team_id}/check`; 
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, team_id }),
      });

      const data = await response.json();
      // console.log(data.status);
      if (data.status === "error") {
        setShowBid(false); 
        setMessage(data.message || "Insufficient budget to place bid.");
      } else if (data.status === "success") {
        setMessage(data.message);
      }
    } catch(error){
      console.log(error);

    }
    }   

    useEffect(() => {
      checkIfCanBid(playerId);
    }, [playerId]);

    const handleBidResponse = (status, msg) => {
    setShowBid(false);
    setMessage(msg);
  }

  async function getPlayers(){
    const url = `http://localhost:3000/teams/${team_id}`;
    try {
      const response = await fetch(url);
      const jsonData = await response.json();
      setTeamName(jsonData.team[0].team_name);
      setTeamBudget(jsonData.team[0].team_budget);
    
      setPlayers(jsonData.team_players);
     
    } catch (error) {
      console.log(error);
      
    }
  }

  useEffect(()=>{
    getPlayers()
  }, [team_id]);

  const handleClick = () => {
    setClicked(!isClicked);
    setButtonText(buttonText=="Bid" ? "Close" : "Bid");
  }

  return (
    <div className="wallpaper">
    <div className="playerContainer">
    <div className='players'>
      <h2>Details for {teamName}</h2>
      <h2 className='playersHeading'>Budget: {teamBudget}</h2>
      <h2 className='playersHeading'>Players</h2>
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

    <div className='bid'>
      {checkIfCanBid(playerId) && showBid ?
      <button className="bidBtn" onClick={handleClick}>{buttonText}</button> :
      null
}
    </div>
    {(isClicked) ?
    <AddBid onBidResponse = {handleBidResponse} message={message}/> :
   <h2>{message}</h2>
}
    </div>  
    </div>
  )
}

export default Team
