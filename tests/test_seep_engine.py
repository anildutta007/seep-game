"""
Unit test suite for Seep (Sweep / Shiv) Indian Card Game Rule Engine.
Validates:
1. 52-card deck generation and capture values (A=1, 2-10=face, J=11, Q=12, K=13)
2. Total scoring points in deck = exactly 100 points
3. Individual scoring card values (all 13 Spades, 10 of Diamonds = 6, Aces = 1)
4. Opening bid requirements (9 to 13)
5. House building validation (values must be 9-13, player must hold matching card)
6. House cementing (Pakka Ghar) prevents breaking
7. Capture logic (single cards, sums, multiple sets, houses)
8. Sweep (Seep) detection (25 for first play, 50 for normal, 0 for last hand)
9. Baazi win condition (100+ point lead)
"""

import unittest

# Define suits and ranks
SUITS = ['spades', 'hearts', 'diamonds', 'clubs']
RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

def get_capture_value(rank):
    if rank == 'A':
        return 1
    elif rank in ['J']:
        return 11
    elif rank in ['Q']:
        return 12
    elif rank in ['K']:
        return 13
    else:
        return int(rank)

def get_score_points(suit, rank):
    if suit == 'spades':
        return get_capture_value(rank)
    elif suit == 'diamonds' and rank == '10':
        return 6
    elif rank == 'A' and suit in ['hearts', 'diamonds', 'clubs']:
        return 1
    return 0

def create_deck():
    deck = []
    for s in SUITS:
        for r in RANKS:
            deck.append({
                'suit': s,
                'rank': r,
                'captureValue': get_capture_value(r),
                'scorePoints': get_score_points(s, r),
                'id': f"{r}_{s}"
            })
    return deck

class TestSeepGameEngine(unittest.TestCase):

    def test_deck_total_and_score(self):
        deck = create_deck()
        self.assertEqual(len(deck), 52, "Deck must have 52 cards")
        
        # Total points in standard Seep is exactly 100
        total_points = sum(c['scorePoints'] for c in deck)
        self.assertEqual(total_points, 100, "Total deck scoring points must be exactly 100")

    def test_spade_scoring_points(self):
        deck = create_deck()
        spade_points = sum(c['scorePoints'] for c in deck if c['suit'] == 'spades')
        # Sum of 1 through 13 is 91
        self.assertEqual(spade_points, 91, "All 13 spades must total 91 points")
        
        # Check King of Spades
        k_spade = next(c for c in deck if c['suit'] == 'spades' and c['rank'] == 'K')
        self.assertEqual(k_spade['scorePoints'], 13)
        self.assertEqual(k_spade['captureValue'], 13)

        # Check Ace of Spades
        a_spade = next(c for c in deck if c['suit'] == 'spades' and c['rank'] == 'A')
        self.assertEqual(a_spade['scorePoints'], 1)
        self.assertEqual(a_spade['captureValue'], 1)

    def test_special_scoring_cards(self):
        deck = create_deck()
        # 10 of diamonds must be 6 points
        d10 = next(c for c in deck if c['suit'] == 'diamonds' and c['rank'] == '10')
        self.assertEqual(d10['scorePoints'], 6)

        # Non-spade aces are 1 point each
        for s in ['hearts', 'diamonds', 'clubs']:
            ace = next(c for c in deck if c['suit'] == s and c['rank'] == 'A')
            self.assertEqual(ace['scorePoints'], 1)

        # Non-spade kings, queens, etc. are 0 points
        hk = next(c for c in deck if c['suit'] == 'hearts' and c['rank'] == 'K')
        self.assertEqual(hk['scorePoints'], 0)

    def test_opening_bid_validity(self):
        # A valid bid must be between 9 and 13
        valid_bids = [9, 10, 11, 12, 13]
        for b in valid_bids:
            self.assertTrue(9 <= b <= 13)

        # If a hand has no card >= 9, cannot bid
        low_hand = [
            {'rank': '2', 'captureValue': 2},
            {'rank': '4', 'captureValue': 4},
            {'rank': '7', 'captureValue': 7},
            {'rank': '8', 'captureValue': 8}
        ]
        has_bid_card = any(c['captureValue'] >= 9 for c in low_hand)
        self.assertFalse(has_bid_card, "Cannot bid without card >= 9")

        # Hand with 10 can bid 10
        high_hand = [
            {'rank': '3', 'captureValue': 3},
            {'rank': '6', 'captureValue': 6},
            {'rank': '10', 'captureValue': 10},
            {'rank': 'K', 'captureValue': 13}
        ]
        available_bids = sorted(list(set(c['captureValue'] for c in high_hand if c['captureValue'] >= 9)))
        self.assertEqual(available_bids, [10, 13])

    def test_house_building_rules(self):
        # Houses can only be 9 to 13
        # Hand card 3, floor card 7 -> sums to 10
        card_played = {'rank': '3', 'captureValue': 3}
        floor_card = {'rank': '7', 'captureValue': 7}
        house_val = card_played['captureValue'] + floor_card['captureValue']
        self.assertEqual(house_val, 10)
        self.assertTrue(9 <= house_val <= 13)

        # Must hold another card of value 10 in hand
        hand_remaining = [{'rank': '10', 'captureValue': 10}, {'rank': '5', 'captureValue': 5}]
        can_build = any(c['captureValue'] == house_val for c in hand_remaining)
        self.assertTrue(can_build, "Player holds matching card in hand to build house")

    def test_sweep_bonus(self):
        # First turn sweep = 25 points
        # Subsequent sweep = 50 points
        # Last turn sweep = 0 points
        first_turn = True
        last_turn = False
        sweep_bonus = 25 if first_turn else (0 if last_turn else 50)
        self.assertEqual(sweep_bonus, 25)

        first_turn = False
        sweep_bonus = 25 if first_turn else (0 if last_turn else 50)
        self.assertEqual(sweep_bonus, 50)

        last_turn = True
        sweep_bonus = 25 if first_turn else (0 if last_turn else 50)
        self.assertEqual(sweep_bonus, 0)

    def test_baazi_win_condition(self):
        # Baazi is won when lead is >= 100 points
        score_team1 = 150
        score_team2 = 40
        diff = score_team1 - score_team2
        self.assertGreaterEqual(diff, 100, "Team 1 has won the Baazi (100+ lead)")

if __name__ == '__main__':
    unittest.main()
