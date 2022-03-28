import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import {
  addDoc,
  collection,
  CollectionReference,
  doc,
  DocumentReference,
  Firestore,
  onSnapshot,
} from '@angular/fire/firestore';
import { updateDoc } from '@firebase/firestore';
import { NgxChessBoardComponent } from 'ngx-chess-board';

@Component({
  selector: 'app-chess',
  templateUrl: './chess.component.html',
  styleUrls: ['./chess.component.scss'],
})
export class ChessComponent implements OnInit {
  public gameCode: string = '';

  private gamesCollection: CollectionReference;
  private gameReference!: DocumentReference;

  @ViewChild('board')
  boardManager!: NgxChessBoardComponent;

  fen!: string;

  public darkTileColor = 'rgb(97, 84, 61)';
  public lightTileColor = '#BAA378';
  public dragDisabled = false;
  public drawDisabled = false;
  public lightDisabled = true;
  public darkDisabled = true;
  public freeMode = false;
  public addPieceCoords: string = 'a4';
  public selectedPiece = '1';
  public selectedColor = '1';
  public pgn: string = '';
  constructor(
    private firestore: Firestore,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.gamesCollection = collection(this.firestore, 'games');
  }

  reset(): void {
    this.boardManager.reset();
    this.fen = this.boardManager.getFEN();
    this.freeMode = false;
  }

  reverse(): void {
    this.boardManager.reverse();
  }

  undo(): void {
    this.boardManager.undo();
    this.fen = this.boardManager.getFEN();
  }

  setFen(): void {
    if (this.fen) {
      this.boardManager.setFEN(this.fen);
    }
  }

  moveCallback(move: any): void {
    this.fen = this.boardManager.getFEN();
    this.pgn = this.boardManager.getPGN();
    updateDoc(this.gameReference, { last_move: move.move });
    console.log(move);
  }

  moveManual(move: string): void {
    this.boardManager.move(move);
  }

  onCreateGameClicked() {
    addDoc(this.gamesCollection, { status: 'new', first_player: true }).then(
      (res) => {
        this.gameReference = doc(this.firestore, res.path);
        this.reset();
        this.subscribeToGameChanges();
      }
    );
  }

  onJoinGameClicked() {
    if (!this.gameCode) {
      alert('Please enter game code');
      return;
    }
    this.gameReference = doc(this.firestore, `games/${this.gameCode}`);
    updateDoc(this.gameReference, { second_player: true })
      .then((res) => {
        this.reset();
        this.reverse();
        this.subscribeToGameChanges();
        this.darkDisabled = false;
      })
      .catch((err) => {
        console.log(err);
        alert('Please enter a valid game code');
      });
  }

  subscribeToGameChanges() {
    onSnapshot(this.gameReference, (res) => {
      console.log(res.data());
      const data = res.data();
      if (data) {
        if (
          data['first_player'] &&
          data['second_player'] &&
          data['status'] === 'new'
        ) {
          updateDoc(this.gameReference, { status: 'ongoing' });
          alert('Second player joined, you can move!');
          this.lightDisabled = false;
        } else if (data['last_move']) {
          this.moveManual(data['last_move']);
        }
      }
    });
  }

  // ----------------------------------------------------------
  // Lifecycle hooks

  ngOnInit(): void {
    this.changeDetectorRef.detectChanges();
  }
}
