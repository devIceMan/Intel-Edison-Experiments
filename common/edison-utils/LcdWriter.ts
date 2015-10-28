interface ILcd {
	setCursor(row: number, column: number);
	setColor(r: number, g: number, b: number);
	write(message: string);
}

export class LcdWriter {
	private _lcd: ILcd;

	constructor(lcd: ILcd) {
		this._lcd = lcd;
	}

	public write(message: string | Array<string>, color: string | Array<number>) {
		LcdWriter.write(this._lcd, message, color);
	}

	private static hexToRgb(hex) {
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = hex.replace(shorthandRegex, function(m, r, g, b) {
			return r + r + g + g + b + b;
		});
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
			: null;
	}

	public static write(lcd: ILcd, message: string | Array<string>, color: string | Array<number>): void {
		message = message || '';
		color = color || '';

		let lines: Array<string> = [];

		if (typeof message == 'string') {
			lines = (message as string).split('\n');
		}
		else if (message instanceof Array) {
			lines = message;
		}

		lines.forEach(function(x, i, a) {
			var s = ('' + x).trim().substr(0, 16);
			while (s.length < 16) {
				s = s + " ";
			}
			a[i] = s;
		});

		let rgb: Array<number> = [255, 255, 255];
		if (color instanceof Array && color.length == 3) {
			rgb = color;
		}
		else if (typeof color == 'string') {
			switch (color) {
				case 'red':
					rgb = [255, 0, 0];
					break;
				case 'green':
					rgb = [0, 255, 0];
					break;
				case 'blue':
					rgb = [0, 0, 255];
					break;
				default:
					if (color[0] == '#') {
						rgb = LcdWriter.hexToRgb(color) || rgb;
					}
			}
		}

		lcd.setColor.apply(lcd, rgb);
		lines.forEach(function(x, i) {
			if (i > 1) return;
			lcd.setCursor(i, 0);
			lcd.write(x)
		})
	}
}

export function getWriter(lcd: ILcd){
	var writer = new LcdWriter(lcd);
	return writer.write.bind(writer);
}
