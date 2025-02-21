import { useState, useMemo } from "react";
import "./styles.css";

export default function App() {
  const [people, setPeople] = useState(8);
  const [pieces, setPieces] = useState(4);
  const cmPerPiece = 25 / 6; // 6 pieces per 25cm

  const [reqCm, minCm] = useMemo(() => {
    const totalPieces = people * pieces;
    const cmForTotalPieces = Math.round(cmPerPiece * totalPieces);
    const order = Math.ceil(cmForTotalPieces / 25) * 25;
    return [cmForTotalPieces, order];
  }, [people, pieces]);
  console.log((minCm - reqCm) / (25 / 6));

  const leftoverSlices = Math.round((minCm - reqCm) / cmPerPiece);

  return (
    <div className="App">
      <div className="content">
        <img
          src="https://www.arrivedercipizza.com.au/images/logos/arrivederci_pizza_logo.svg"
          alt="Arrivederci Pizzeria - Taste Brisbanes best pizza at Arrivederci Pizzeria. Arrivederci is a leading Italian Restaurant in Milton that offers a wide range of pizzas, pasta"
        />
        <h3>DerciCalc</h3>
        <table>
          <tbody>
            <tr>
              <td>People:</td>
              <td>
                <input
                  type="number"
                  defaultValue={people}
                  onChange={(e) => setPeople(e.target.value)}
                  pattern="[0-9]*"
                ></input>
              </td>
            </tr>
            <tr>
              <td>Slices per person:</td>
              <td>
                <input
                  type="number"
                  defaultValue={pieces}
                  onChange={(e) => setPieces(parseInt(e.target.value))}
                  pattern="[0-9]*"
                ></input>
              </td>
            </tr>
            <tr>
              <td>Required length:</td>
              <td>{reqCm}cm</td>
            </tr>
            <tr>
              <th>Minimum order:</th>
              <td>
                <b>{minCm}cm</b>
              </td>
            </tr>
            <tr>
              <td>Leftover slices:</td>
              <td>{leftoverSlices}</td>
            </tr>
          </tbody>
        </table>
        <div className="feedback">
          {people <= 0 ? "Zero people...no friends?" : null}
          {pieces <= 0 ? "Disgraceful" : null}
          {pieces === 1 ? "I'm not angry, just disappointed" : null}
          {pieces === 2 ? "Got to bump those numbers up, those are rookie numbers" : null}
          {pieces === 6 ? "So, you're hungry then" : null}
          {pieces >= 7 ? "Certified god-tier pizza lover" : null}
        </div>
      </div>
      <div className="pizza" />
    </div>
  );
}
