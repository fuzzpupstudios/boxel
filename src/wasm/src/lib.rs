use fastnoise2::SafeNode;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct FastNoise2 {
    node: SafeNode
}

#[wasm_bindgen]
impl FastNoise2 {
    #[wasm_bindgen(constructor)]
    pub fn new(encoded_tree: &str) -> FastNoise2 {
        let node = SafeNode::from_encoded_node_tree(&encoded_tree).unwrap();
        FastNoise2 { node }
    }
    
    pub fn generate_2d(&self, x_offset: f32, y_offset: f32, x_count: i32, y_count: i32, x_step_size: f32, y_step_size: f32, seed: i32) -> Vec<f32> {
        let size = (x_count as usize) * (y_count as usize);
        let mut noise_out: Vec<f32> = vec![0.0; size];
        self.node.gen_uniform_grid_2d(&mut noise_out, x_offset, y_offset, x_count, y_count, x_step_size, y_step_size, seed);

        noise_out
    }
    
    pub fn generate_3d(&self, x_offset: f32, y_offset: f32, z_offset: f32, x_count: i32, y_count: i32, z_count: i32, x_step_size: f32, y_step_size: f32, z_step_size: f32, seed: i32) -> Vec<f32> {
        let size = (x_count as usize) * (y_count as usize) * (z_count as usize);
        let mut noise_out: Vec<f32> = vec![0.0; size];
        self.node.gen_uniform_grid_3d(&mut noise_out, x_offset, y_offset, z_offset, x_count, y_count, z_count, x_step_size, y_step_size, z_step_size, seed);

        noise_out
    }
}
