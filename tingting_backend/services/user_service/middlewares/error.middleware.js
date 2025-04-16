const errorMiddleware = (err, req, res, next) => {
    try {
        let error = { ...err };
        error.message = err.message;
<<<<<<< HEAD
       
=======
        console.log("Over there in error middleware");
        

>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
        console.error(err);

        //Mongooes bad object id    
        if (err.name === "CastError") {
<<<<<<< HEAD
            const message = `Resource not found 1`;
=======
            const message = `Resource not found`;
>>>>>>> 7e746dcef74e46876ab5843319f2501a2f21aae6
            error = new Error(message);
            error.statusCode = 404;
        }
        //Mongooes duplicate key
        if (err.code === 11000) {
            const message = "Duplicate field value entered";
            error = new Error(message);
            error.statusCode = 400;
        }
        //Mongoose validation error
        if (err.name === "ValidationError") {
            const message = Object.values(err.errors).map((val) => val.message);
            error = new Error(message.join(", "));
            error.statusCode = 400;
        }

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Server Error",
        });
    } catch (error) {
        next(error);
    }
};

export default errorMiddleware;