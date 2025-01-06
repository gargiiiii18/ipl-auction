import React, {useEffect, useState} from 'react'
import { useParams } from 'react-router-dom';

const DisplayResult = () => {

  const [winnerPossible, setWinnerPossible] = useState(false);
  const [winner, setWinner] = useState([]);
  const[message, setMessage] = useState("");

  const player_id_obj = useParams();
 const player_id = player_id_obj.player_id;
 console.log(player_id);
 

  useEffect(() => {
    const fetchWinner = async (player_id) => {
      const url = `http://localhost:3000/result/${player_id}`;
      try {
        const response = await fetch(url);
        const result = await response.json(); 
        if(result.status == "error"){
          setWinnerPossible(false);
          setMessage(result.message);
        }
        else if(result.status == "success"){
        setWinnerPossible(true);
        setWinner(result.data);  
        }
      } catch (error) {
        console.log(error);
      }
    }

    fetchWinner(player_id);

  }, [player_id]);

  return (
    <div className="wrapper">  
    {winnerPossible ? 
    <div className='resultContainer'>
      <h2>Result</h2>
      {winner.map(winner => (
      <h2>Player sold to team {winner.team_name}</h2>
    ))}
      <h2 className="congrats">🎉 Congratulations 🎉</h2>
    </div>
: 
<h2 className='errorMsg'>{message}</h2>
}

    </div>
  )
}

export default DisplayResult
