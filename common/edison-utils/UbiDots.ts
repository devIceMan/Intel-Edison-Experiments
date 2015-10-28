interface IObservation {
	timestamp: number,
	value: any,
	variable: string
}

export class UbiDots {
	private _client: any;
	private _observations: Array<IObservation>

	constructor(client: any) {
		this._client = client;
		this._observations = [];
	}

	public connect(): any {
		if (this._client._authenticationError) return this._client._authenticationError;
		if (this._client._isAuthenticating) return false;
		if (this._client._isAuthenticated) return true;

		var me = this;
		this._client._isAuthenticating = true;

		this._client.auth(function(e) {
			me._client._isAuthenticating = false;
			if (e) {
				me._client._authenticationError = e;
				throw e;
			}
			me._client._isAuthenticated = true;
		});

		return false;
	}

	public sendObservation(observation: IObservation) {
		var ready = this.connect();
		switch (ready) {
			case true:
				if (this._observations.length) {
					var data = this._observations;
					this._observations = [];
					data.push(observation);

					data.forEach(function(x) {
						var variable = this._client.getVariable(x.variable);
						variable.saveValue(x);
					}, this);
				}
				else {
					this._client.getVariable(observation.variable).saveValue(observation);
				}
				break;

			case false:
				this._observations.push(observation);
				break;
			default:
				console.error(ready);

		}

	}

	public sendValue(variable: string, value: any, timestamp?: number) {
		timestamp = timestamp || Date.now();
		return this.sendObservation({ timestamp: timestamp, value: value, variable: variable });
	}
}