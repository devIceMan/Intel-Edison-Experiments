module.exports = {
    map: {
        '.-': 'A',
        '-...': 'B',
        '-.-.': 'C',
        '-..': 'D',
        '.': 'E',
        '..-.': 'F',
        '--.': 'G',
        '....': 'H',
        '..': 'I',
        '.---': 'J',
        '-.-': 'K',
        '.-..': 'L',
        '--': 'M',
        '-.': 'N',
        '---': 'O',
        '.--.': 'P',
        '--.-': 'Q',
        '.-.': 'R',
        '...': 'S',
        '-': 'T',
        '..-': 'U',
        '...-': 'V',
        '.--': 'W',
        '-..-': 'X',
        '-.--': 'Y',
        '--..': 'Z',

        '.----': '1',
        '..---': '2',
        '...--': '3',
        '....-': '4',
        '.....': '5',
        '-....': '6',
        '--...': '7',
        '---..': '8',
        '----.': '9',
        '-----': '0'
    },

    wordToMorze: function(word) {
        var hash = {};
        word.toUpperCase().split('').forEach(function(x) { hash[x] = true; });

        Object.keys(this.map).forEach(function(k) {
            var c = this.map[k];
            hash[c] && (hash[c] = k);
        }, this);

        var result = Object.keys(hash)
            .map(function(x) {
                return hash[x];
            })
            .join(' ');

        return result;
    }
};