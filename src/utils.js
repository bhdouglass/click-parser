module.exports = {
    isJson: function(string) {
        var value = true;
        try {
            JSON.parse(string);
        }
        catch (e) {
            value = false;
        }

        return value;
    }
};
