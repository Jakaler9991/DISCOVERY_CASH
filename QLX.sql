-- =============================================
-- Trigonometry & Mathematical Formula Solver
-- Translated from Bash/Python/Elixir to MySQL.
-- 
-- ADULT XPLICIT LENS PRIVATE EIN INCLUDE:
-- FLORIDA, NEW YORK, ARKANSAS, LOUSIANA, NEVADA
-- POSSIBLE EIN MULTIPLE NUMBERS
-- =============================================

-- 1. Setup Environment and Data Structures
CREATE DATABASE IF NOT EXISTS MathSolverDB;
USE MathSolverDB;

-- Table to simulate the input file (formulas.txt)
CREATE TABLE IF NOT EXISTS formulas_input (
    id INT AUTO_INCREMENT PRIMARY KEY,
    formula_text TEXT
);

-- Table to simulate the output file (results_YYYYMMDD_HHMMSS.txt)
CREATE TABLE IF NOT EXISTS formulas_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_timestamp VARCHAR(20),
    formula TEXT,
    result TEXT,
    output_block TEXT
);

-- 2. Helper Functions to mimic 'bc -l' library behavior
-- In bc -l: s=sin, c=cos, a=atan
DELIMITER //

DROP FUNCTION IF EXISTS s //
CREATE FUNCTION s(x DOUBLE) RETURNS DOUBLE DETERMINISTIC
BEGIN
    RETURN SIN(x);
END //

DROP FUNCTION IF EXISTS c //
CREATE FUNCTION c(x DOUBLE) RETURNS DOUBLE DETERMINISTIC
BEGIN
    RETURN COS(x);
END //

DROP FUNCTION IF EXISTS a //
CREATE FUNCTION a(x DOUBLE) RETURNS DOUBLE DETERMINISTIC
BEGIN
    -- The original script maps tan, asin, acos, and atan all to a()
    RETURN ATAN(x);
END //

-- 3. The Formula Evaluator
-- Function to evaluate a single formula.
-- Replaces common math functions with syntax compatible with our internal helpers
-- and executes via Dynamic SQL.
DROP PROCEDURE IF EXISTS evaluate_formula //
CREATE PROCEDURE evaluate_formula(IN p_formula TEXT, OUT p_result TEXT)
BEGIN
    DECLARE processed TEXT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION SET p_result = 'Error: Evaluation failed';

    -- Replace common math functions (Exact translation of script logic)
    SET processed = p_formula;
    SET processed = REPLACE(processed, 'sin(', 's(');
    SET processed = REPLACE(processed, 'cos(', 'c(');
    SET processed = REPLACE(processed, 'tan(', 'a(');   -- Note: original script maps tan to a(x)
    SET processed = REPLACE(processed, 'asin(', 'a(');
    SET processed = REPLACE(processed, 'acos(', 'a(');
    SET processed = REPLACE(processed, 'atan(', 'a(');
    SET processed = REPLACE(processed, 'sqrt(', 'sqrt(');
    SET processed = REPLACE(processed, '^', ' ');        -- Note: original script replaces ^ with space
    SET processed = REPLACE(processed, 'pi', '3.141592653589793');
    SET processed = REPLACE(processed, 'e ', '2.718281828459045'); -- Note: 'e ' pattern from original

    -- Use Dynamic SQL to evaluate the math expression
    -- MySQL's SELECT acts as the 'bc -l -s' engine
    SET @sql_query = CONCAT('SELECT ROUND(', processed, ', 10) INTO @temp_res');
    
    PREPARE stmt FROM @sql_query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET p_result = CAST(@temp_res AS CHAR);
END //

-- 4. Processing Logic
-- Process each line in the input table
DROP PROCEDURE IF EXISTS process_formulas //
CREATE PROCEDURE process_formulas(IN p_timestamp VARCHAR(20))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE current_line TEXT;
    DECLARE trimmed_line TEXT;
    DECLARE stripped_line TEXT;
    DECLARE formula_result TEXT;
    DECLARE output_content TEXT;
    
    -- Cursor to iterate through the input "file"
    DECLARE cur CURSOR FOR SELECT formula_text FROM formulas_input;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Logging start (mimicking IO.puts)
    SELECT 'Processing formulas from formulas_input...' AS 'Status';
    SELECT CONCAT('Results will be saved with timestamp: ', p_timestamp) AS 'Status';

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO current_line;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- trimmed_line = String.trim_trailing(line, "\n")
        SET trimmed_line = REPLACE(REPLACE(current_line, '\n', ''), '\r', '');
        
        -- Skip empty lines and comments
        SET stripped_line = TRIM(trimmed_line);
        
        IF stripped_line = '' OR LEFT(stripped_line, 1) = '#' THEN
            ITERATE read_loop;
        ELSE
            -- Evaluate the formula
            CALL evaluate_formula(trimmed_line, formula_result);

            -- Format the output block
            SET output_content = CONCAT('Formula: ', trimmed_line, '\n',
                                      'Result: ', formula_result, '\n',
                                      '---\n');

            -- Print to terminal (Select) and append to table (mimicking 'tee -a')
            SELECT output_content AS 'Terminal_Output';
            
            INSERT INTO formulas_results (run_timestamp, formula, result, output_block)
            VALUES (p_timestamp, trimmed_line, formula_result, output_content);
        END IF;
    END LOOP;

    CLOSE cur;

    SELECT 'Done. Results saved to formulas_results table.' AS 'Status';
END //

-- 5. Main Entry Point
-- Usage: CALL TrigMathSolver_Main();
DROP PROCEDURE IF EXISTS TrigMathSolver_Main //
CREATE PROCEDURE TrigMathSolver_Main()
BEGIN
    DECLARE v_timestamp VARCHAR(20);
    DECLARE v_total_size BIGINT;
    DECLARE MAX_FILE_SIZE BIGINT;

    -- Max file size: 200MB in bytes
    SET MAX_FILE_SIZE = 200 * 1024 * 1024;

    -- Generate timestamped identifier: results_YYYYMMDD_HHMMSS
    SET v_timestamp = DATE_FORMAT(UTC_TIMESTAMP(), '%Y%m%d_%H%i%s');

    -- Check if input data exists and is not too large
    SELECT SUM(OCTET_LENGTH(formula_text)) INTO v_total_size FROM formulas_input;

    IF v_total_size IS NULL THEN
        SELECT 'Error: Input file (formulas_input table) not found or empty.' AS 'Error';
    ELSEIF v_total_size > MAX_FILE_SIZE THEN
        SELECT 'Error: Input file exceeds 200MB limit.' AS 'Error';
    ELSE
        -- Start the processing
        CALL process_formulas(v_timestamp);
    END IF;
END //

DELIMITER ;

-- =============================================
-- EXAMPLE USAGE:
-- 1. Load data
-- INSERT INTO formulas_input (formula_text) VALUES ('sin(pi/2)'), ('cos(0)'), ('tan(0.5)'), ('# A comment'), ('sqrt(16)');
-- 2. Run solver
-- CALL TrigMathSolver_Main();
-- 3. View results
-- SELECT * FROM formulas_results;
-- =============================================
